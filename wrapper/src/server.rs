//! Axum router serving the embedded React build with SPA history fallback.
//!
//! Routing rules:
//!
//! - `GET /healthz` — plugin liveness probe (does not hit the daemon).
//! - `GET /*path` — exact match against the embedded dist; on miss the
//!   request falls through to `index.html` so React Router can handle it.
//! - Fingerprinted bundle assets get a long, immutable `Cache-Control`;
//!   `index.html` is always served `no-cache` so deploys roll out instantly.
//!
//! When the embedded dist is empty (fresh checkout without `npm run build`),
//! the catch-all route returns a static placeholder explaining how to build
//! the UI instead of a confusing 404.

use axum::body::Body;
use axum::extract::{ws::WebSocketUpgrade, State};
use axum::http::{header, HeaderValue, Method, Request, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::{any, get};
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::{client::IntoClientRequest, Message as UpstreamMessage};

use crate::config::WebUiSettings;
use crate::embed;

const PLACEHOLDER_HTML: &str = include_str!("placeholder.html");

#[derive(Clone)]
pub struct AppState {
    pub settings: WebUiSettings,
    http_client: reqwest::Client,
}

pub fn build_router(settings: WebUiSettings) -> Router {
    let state = AppState {
        settings,
        http_client: reqwest::Client::new(),
    };

    Router::new()
        .route("/healthz", get(healthz))
        .route("/graphql", any(graphql_http_proxy))
        .route("/graphql/sdl", any(graphql_http_proxy))
        .route("/graphql/ws", get(graphql_websocket_proxy))
        .fallback(static_handler)
        .with_state(state)
}

async fn healthz() -> impl IntoResponse {
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json")],
        r#"{"ok":true,"plugin":"animus-web-ui"}"#,
    )
}

async fn graphql_http_proxy(State(state): State<AppState>, req: Request<Body>) -> Response {
    let target = format!(
        "{}{}",
        state.settings.graphql_origin().trim_end_matches('/'),
        req.uri()
            .path_and_query()
            .map(|value| value.as_str())
            .unwrap_or(req.uri().path())
    );
    let (parts, body) = req.into_parts();
    let body = match axum::body::to_bytes(body, 16 * 1024 * 1024).await {
        Ok(body) => body,
        Err(error) => {
            tracing::warn!(%error, "failed to read GraphQL request body");
            return StatusCode::BAD_REQUEST.into_response();
        }
    };

    let mut upstream = state.http_client.request(parts.method, target).body(body);
    for (name, value) in &parts.headers {
        if name != header::HOST && !is_hop_by_hop(name) {
            upstream = upstream.header(name, value);
        }
    }

    let response = match upstream.send().await {
        Ok(response) => response,
        Err(error) => {
            tracing::warn!(%error, "GraphQL upstream request failed");
            return StatusCode::BAD_GATEWAY.into_response();
        }
    };
    let status = response.status();
    let headers = response.headers().clone();
    let body = match response.bytes().await {
        Ok(body) => body,
        Err(error) => {
            tracing::warn!(%error, "failed to read GraphQL upstream response");
            return StatusCode::BAD_GATEWAY.into_response();
        }
    };

    let mut result = Response::new(Body::from(body));
    *result.status_mut() = status;
    for (name, value) in &headers {
        if !is_hop_by_hop(name) {
            result.headers_mut().append(name, value.clone());
        }
    }
    result
}

async fn graphql_websocket_proxy(State(state): State<AppState>, ws: WebSocketUpgrade) -> Response {
    let origin = state.settings.graphql_origin();
    let origin = origin
        .strip_prefix("https://")
        .map(|host| format!("wss://{host}"))
        .or_else(|| {
            origin
                .strip_prefix("http://")
                .map(|host| format!("ws://{host}"))
        })
        .unwrap_or_else(|| origin.to_string());
    let target = format!("{}/graphql/ws", origin.trim_end_matches('/'));
    ws.protocols(["graphql-transport-ws"])
        .on_upgrade(move |client| async move {
            let mut request = match target.into_client_request() {
                Ok(request) => request,
                Err(error) => {
                    tracing::warn!(%error, "invalid GraphQL websocket upstream URL");
                    return;
                }
            };
            request.headers_mut().insert(
                header::SEC_WEBSOCKET_PROTOCOL,
                HeaderValue::from_static("graphql-transport-ws"),
            );
            match connect_async(request).await {
                Ok((upstream, _)) => bridge_websockets(client, upstream).await,
                Err(error) => tracing::warn!(%error, "GraphQL websocket upstream failed"),
            }
        })
}

async fn bridge_websockets(
    client: axum::extract::ws::WebSocket,
    upstream: tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
) {
    use axum::extract::ws::Message as ClientMessage;

    let (mut client_tx, mut client_rx) = client.split();
    let (mut upstream_tx, mut upstream_rx) = upstream.split();
    loop {
        tokio::select! {
            message = client_rx.next() => match message {
                Some(Ok(ClientMessage::Text(text))) => {
                    if upstream_tx.send(UpstreamMessage::Text(text.to_string())).await.is_err() { break; }
                }
                Some(Ok(ClientMessage::Binary(bytes))) => {
                    if upstream_tx.send(UpstreamMessage::Binary(bytes.to_vec())).await.is_err() { break; }
                }
                Some(Ok(ClientMessage::Ping(bytes))) => {
                    if upstream_tx.send(UpstreamMessage::Ping(bytes.to_vec())).await.is_err() { break; }
                }
                Some(Ok(ClientMessage::Pong(bytes))) => {
                    if upstream_tx.send(UpstreamMessage::Pong(bytes.to_vec())).await.is_err() { break; }
                }
                Some(Ok(ClientMessage::Close(_))) | None | Some(Err(_)) => {
                    let _ = upstream_tx.send(UpstreamMessage::Close(None)).await;
                    break;
                }
            },
            message = upstream_rx.next() => match message {
                Some(Ok(UpstreamMessage::Text(text))) => {
                    if client_tx.send(ClientMessage::Text(text.into())).await.is_err() { break; }
                }
                Some(Ok(UpstreamMessage::Binary(bytes))) => {
                    if client_tx.send(ClientMessage::Binary(bytes.into())).await.is_err() { break; }
                }
                Some(Ok(UpstreamMessage::Ping(bytes))) => {
                    if client_tx.send(ClientMessage::Ping(bytes.into())).await.is_err() { break; }
                }
                Some(Ok(UpstreamMessage::Pong(bytes))) => {
                    if client_tx.send(ClientMessage::Pong(bytes.into())).await.is_err() { break; }
                }
                Some(Ok(UpstreamMessage::Close(_))) | None | Some(Err(_)) => {
                    let _ = client_tx.send(ClientMessage::Close(None)).await;
                    break;
                }
                Some(Ok(UpstreamMessage::Frame(_))) => {}
            }
        }
    }
}

fn is_hop_by_hop(name: &axum::http::header::HeaderName) -> bool {
    matches!(
        name.as_str().to_ascii_lowercase().as_str(),
        "connection"
            | "keep-alive"
            | "proxy-authenticate"
            | "proxy-authorization"
            | "te"
            | "trailer"
            | "transfer-encoding"
            | "upgrade"
    )
}

async fn static_handler(State(_state): State<AppState>, req: Request<Body>) -> Response {
    if req.method() != Method::GET && req.method() != Method::HEAD {
        return (StatusCode::METHOD_NOT_ALLOWED, "method not allowed").into_response();
    }

    let uri: &Uri = req.uri();
    let path = uri.path();

    if !embed::is_populated() {
        return placeholder_response();
    }

    if let Some(file) = embed::lookup(path) {
        return serve_file(path, file.contents());
    }

    if looks_like_asset(path) {
        return (StatusCode::NOT_FOUND, "not found").into_response();
    }

    match embed::index_html() {
        Some(bytes) => serve_index(bytes),
        None => placeholder_response(),
    }
}

fn serve_file(path: &str, bytes: &'static [u8]) -> Response {
    if path == "/" || path == "/index.html" {
        return serve_index(bytes);
    }

    let mime = mime_guess::from_path(path).first_or_octet_stream();
    let mut resp = Response::new(Body::from(bytes));
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(mime.as_ref())
            .unwrap_or(HeaderValue::from_static("application/octet-stream")),
    );
    if embed::is_fingerprinted(path) {
        resp.headers_mut().insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=31536000, immutable"),
        );
    } else {
        resp.headers_mut().insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("public, max-age=300"),
        );
    }
    resp
}

fn serve_index(bytes: &'static [u8]) -> Response {
    let mut resp = Response::new(Body::from(bytes));
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    resp.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-cache, no-store, must-revalidate"),
    );
    resp
}

fn placeholder_response() -> Response {
    let mut resp = Response::new(Body::from(PLACEHOLDER_HTML));
    resp.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("text/html; charset=utf-8"),
    );
    resp.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-cache, no-store, must-revalidate"),
    );
    *resp.status_mut() = StatusCode::OK;
    resp
}

fn looks_like_asset(path: &str) -> bool {
    let last = path.rsplit('/').next().unwrap_or("");
    last.contains('.')
}
