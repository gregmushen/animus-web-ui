//! Binary entrypoint — wires [`WebUiBackend`] into the runtime's
//! [`transport_backend_main`] driver so the plugin host can manage its
//! lifecycle over stdio.

use animus_plugin_protocol::PluginInfo;
use animus_plugin_runtime::transport_backend_main_with_capabilities;
use animus_transport_protocol::PLUGIN_KIND_TRANSPORT_BACKEND;

use animus_web_ui::WebUiBackend;

/// Capability marker advertised so the daemon's `animus web open` picks this
/// plugin as the UI surface even though `plugin_kind` is `transport_backend`.
/// Consumed by `orchestrator-cli::ops_web::plugin_advertises_web_ui` via the
/// v0.1.13 `extra_capabilities` extension point.
const WEB_UI_CAPABILITY: &str = "$ui/web";

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    emit_manifest_if_requested();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_writer(std::io::stderr)
        .init();

    let backend = WebUiBackend::default();
    let info = PluginInfo {
        name: env!("CARGO_PKG_NAME").into(),
        version: env!("CARGO_PKG_VERSION").into(),
        plugin_kind: PLUGIN_KIND_TRANSPORT_BACKEND.into(),
        description: Some(env!("CARGO_PKG_DESCRIPTION").into()),
    };

    transport_backend_main_with_capabilities(info, backend, vec![WEB_UI_CAPABILITY.to_string()])
        .await
}

fn emit_manifest_if_requested() {
    if !std::env::args()
        .skip(1)
        .any(|arg| arg == "--manifest" || arg == "-m")
    {
        return;
    }

    let manifest = serde_json::json!({
        "name": env!("CARGO_PKG_NAME"),
        "version": env!("CARGO_PKG_VERSION"),
        "plugin_kind": "transport_backend",
        "description": env!("CARGO_PKG_DESCRIPTION"),
        "protocol_version": animus_plugin_protocol::PROTOCOL_VERSION,
        "capabilities": [
            "transport/start",
            "transport/shutdown",
            "transport/schema",
            "health/check",
            WEB_UI_CAPABILITY
        ],
        "env_required": []
    });
    println!(
        "{}",
        serde_json::to_string(&manifest).expect("serialize manifest")
    );
    std::process::exit(0);
}
