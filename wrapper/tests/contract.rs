//! Contract tests for the `WebUiBackend` `TransportBackend` impl + router.
//!
//! These exercise the trait lifecycle (start → schema → health → shutdown)
//! and the SPA fallback router without needing a live daemon.

use std::path::PathBuf;

use animus_plugin_protocol::HealthStatus;
use animus_transport_protocol::{TransportBackend, TransportConfig};
use animus_web_ui::backend::DEFAULT_PORT;
use animus_web_ui::config::WebUiSettings;
use animus_web_ui::embed;
use animus_web_ui::server::build_router;
use animus_web_ui::WebUiBackend;
use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;

fn test_settings() -> WebUiSettings {
    WebUiSettings {
        bind_addr: "127.0.0.1:0".to_string(),
        control_socket_path: PathBuf::from("/tmp/animus-web-ui-test.sock"),
        project_root: PathBuf::from("/tmp"),
        api_origin: None,
    }
}

async fn body_string(app: axum::Router, method: &str, path: &str) -> (StatusCode, String) {
    let req = Request::builder()
        .method(method)
        .uri(path)
        .body(Body::empty())
        .unwrap();
    let response = app.oneshot(req).await.unwrap();
    let status = response.status();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (status, String::from_utf8_lossy(&bytes).to_string())
}

#[tokio::test]
async fn healthz_returns_ok_envelope() {
    let app = build_router(test_settings());
    let (status, body) = body_string(app, "GET", "/healthz").await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("\"ok\":true"));
    assert!(body.contains("animus-web-ui"));
}

#[tokio::test]
async fn spa_fallback_returns_200_for_unknown_path() {
    let app = build_router(test_settings());
    let (status, body) = body_string(app, "GET", "/some/spa/route").await;
    assert_eq!(status, StatusCode::OK, "got {status} body={body}");

    if embed::is_populated() {
        assert!(
            body.contains("<html") || body.contains("<!doctype"),
            "expected HTML, got: {}",
            &body[..body.len().min(120)]
        );
    } else {
        assert!(body.contains("build the UI first"));
    }
}

#[tokio::test]
async fn root_path_returns_200() {
    let app = build_router(test_settings());
    let (status, _) = body_string(app, "GET", "/").await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn non_get_method_rejected() {
    let app = build_router(test_settings());
    let req = Request::builder()
        .method("POST")
        .uri("/some/path")
        .body(Body::from("{}"))
        .unwrap();
    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}

#[tokio::test]
async fn missing_asset_404s_when_built() {
    let app = build_router(test_settings());
    let (status, _) = body_string(app, "GET", "/assets/does-not-exist.js").await;
    if embed::is_populated() {
        assert_eq!(status, StatusCode::NOT_FOUND);
    } else {
        assert_eq!(status, StatusCode::OK);
    }
}

#[tokio::test]
async fn backend_lifecycle_round_trip() {
    let backend = WebUiBackend::default();

    let schema = backend.schema();
    assert_eq!(schema.default_port, Some(DEFAULT_PORT));
    assert!(schema.kinds.iter().any(|k| k == "http"));
    assert!(schema.supports_websocket);

    let health_before = backend.health().await.expect("health");
    assert!(matches!(health_before.status, HealthStatus::Degraded));

    let config = TransportConfig {
        control_socket_path: PathBuf::from("/tmp/animus-web-ui-test.sock"),
        project_root: PathBuf::from("/tmp"),
        bind_addr: Some("127.0.0.1:0".into()),
        config: serde_json::Value::Null,
    };
    let info = backend.start(config).await.expect("start");
    assert!(info.bound_addr.starts_with("127.0.0.1:"));

    let health_after = backend.health().await.expect("health");
    assert!(matches!(health_after.status, HealthStatus::Healthy));

    backend.shutdown().await.expect("shutdown");
    backend.shutdown().await.expect("idempotent shutdown");

    let health_post = backend.health().await.expect("health");
    assert!(matches!(health_post.status, HealthStatus::Degraded));
}

#[tokio::test]
async fn fingerprint_heuristic_recognizes_vite_hashes() {
    assert!(embed::is_fingerprinted("/assets/index-AbCdEf12.js"));
    assert!(embed::is_fingerprinted("assets/react-vendor-1a2b3c4d.js"));
    assert!(!embed::is_fingerprinted("/assets/index.js"));
    assert!(!embed::is_fingerprinted("/index.html"));
    assert!(!embed::is_fingerprinted("/favicon.ico"));
}
