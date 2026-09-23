//! Plugin-local view of [`TransportConfig`] fields.

use std::path::PathBuf;

use animus_transport_protocol::TransportConfig;

#[derive(Debug, Clone)]
pub struct WebUiSettings {
    pub bind_addr: String,
    pub control_socket_path: PathBuf,
    pub project_root: PathBuf,
    pub api_origin: Option<String>,
}

impl WebUiSettings {
    pub const DEFAULT_BIND_ADDR: &'static str = "127.0.0.1:8082";
    pub const DEFAULT_GRAPHQL_ORIGIN: &'static str = "http://127.0.0.1:8081";

    pub fn graphql_origin(&self) -> &str {
        self.api_origin
            .as_deref()
            .unwrap_or(Self::DEFAULT_GRAPHQL_ORIGIN)
    }

    pub fn from_config(config: &TransportConfig) -> Self {
        let api_origin = config
            .config
            .get("api_origin")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        Self {
            bind_addr: config
                .bind_addr
                .clone()
                .unwrap_or_else(|| Self::DEFAULT_BIND_ADDR.to_string()),
            control_socket_path: config.control_socket_path.clone(),
            project_root: config.project_root.clone(),
            api_origin,
        }
    }
}
