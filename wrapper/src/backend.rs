//! `TransportBackend` implementation backed by Axum.
//!
//! The backend keeps the bound address, accept-loop join handle, and start
//! timestamp behind `Arc<Mutex<_>>` so the trait's `&self` methods can mutate
//! shared state without leaking the `TransportConfig` payload across calls.

use std::sync::Arc;

use animus_plugin_protocol::{HealthCheckResult, HealthStatus};
use animus_transport_protocol::{
    BackendError, TransportBackend, TransportConfig, TransportInfo, TransportSchema,
};
use async_trait::async_trait;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

use crate::config::WebUiSettings;
use crate::server;

pub const DEFAULT_PORT: u16 = 8082;

#[derive(Default)]
pub struct WebUiBackend {
    server_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
    bound_addr: Arc<Mutex<Option<String>>>,
    started_at: Arc<Mutex<Option<chrono::DateTime<chrono::Utc>>>>,
}

#[async_trait]
impl TransportBackend for WebUiBackend {
    async fn start(&self, config: TransportConfig) -> Result<TransportInfo, BackendError> {
        let settings = WebUiSettings::from_config(&config);
        let app = server::build_router(settings.clone());

        let listener = tokio::net::TcpListener::bind(&settings.bind_addr)
            .await
            .map_err(|e| {
                if e.kind() == std::io::ErrorKind::AddrInUse {
                    BackendError::AddressInUse(settings.bind_addr.clone())
                } else if e.kind() == std::io::ErrorKind::PermissionDenied {
                    BackendError::PermissionDenied(settings.bind_addr.clone())
                } else {
                    BackendError::Other(anyhow::anyhow!(
                        "failed to bind {}: {e}",
                        settings.bind_addr
                    ))
                }
            })?;

        let bound = match listener.local_addr() {
            Ok(addr) => addr.to_string(),
            Err(_) => settings.bind_addr.clone(),
        };

        tracing::info!(addr = %bound, "animus-web-ui listening");

        let handle = tokio::spawn(async move {
            if let Err(err) = axum::serve(listener, app).await {
                tracing::error!(error = %err, "axum::serve exited with error");
            }
        });

        let started_at = chrono::Utc::now();
        *self.server_handle.lock().await = Some(handle);
        *self.bound_addr.lock().await = Some(bound.clone());
        *self.started_at.lock().await = Some(started_at);

        Ok(TransportInfo {
            bound_addr: bound,
            started_at,
        })
    }

    async fn shutdown(&self) -> Result<(), BackendError> {
        if let Some(h) = self.server_handle.lock().await.take() {
            h.abort();
        }
        *self.bound_addr.lock().await = None;
        *self.started_at.lock().await = None;
        Ok(())
    }

    fn schema(&self) -> TransportSchema {
        TransportSchema {
            kinds: vec!["http".into(), "static".into()],
            supports_streaming: false,
            supports_websocket: true,
            default_port: Some(DEFAULT_PORT),
        }
    }

    async fn health(&self) -> Result<HealthCheckResult, BackendError> {
        let started = *self.started_at.lock().await;
        let uptime_ms = started.map(|t| {
            chrono::Utc::now()
                .signed_duration_since(t)
                .num_milliseconds()
                .max(0) as u64
        });

        Ok(HealthCheckResult {
            status: if started.is_some() {
                HealthStatus::Healthy
            } else {
                HealthStatus::Degraded
            },
            uptime_ms,
            memory_usage_bytes: None,
            last_error: None,
        })
    }
}
