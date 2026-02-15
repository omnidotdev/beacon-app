//! Beacon App - Tauri application
//!
//! This app connects to the beacon-gateway for all AI functionality.
//! The gateway can run as:
//! - A sidecar process (managed by the app)
//! - An external daemon (user-managed)
//! - A remote server (via mDNS discovery or manual URL)

use std::path::PathBuf;
use std::process::Child;
use std::sync::Arc;

use directories::ProjectDirs;
use tauri::Manager;
use tokio::sync::RwLock;

mod commands;
mod gateway;

use commands::{
    // Gateway management
    get_gateway_status, start_gateway, stop_gateway,
    // Storage commands
    get_secure_storage, set_secure_storage,
};

/// Gateway connection state
#[derive(Debug, Clone, PartialEq)]
pub enum GatewayState {
    /// Not connected to any gateway
    Disconnected,

    /// Starting the sidecar process
    Starting,

    /// Connected to gateway at URL
    Connected { url: String, is_sidecar: bool },

    /// Connection failed
    Failed { error: String },
}

/// Application state shared across IPC commands
pub struct AppState {
    /// Current gateway connection state
    pub gateway_state: RwLock<GatewayState>,

    /// Gateway URL (configured or discovered)
    pub gateway_url: RwLock<Option<String>>,

    /// Sidecar process handle (if running as sidecar)
    pub sidecar_process: RwLock<Option<Child>>,

    /// Data directory for app storage
    pub data_dir: PathBuf,
}

impl AppState {
    /// Check if connected to a gateway
    pub async fn is_connected(&self) -> bool {
        matches!(&*self.gateway_state.read().await, GatewayState::Connected { .. })
    }

    /// Get the current gateway URL if connected
    pub async fn gateway_url(&self) -> Option<String> {
        match &*self.gateway_state.read().await {
            GatewayState::Connected { url, .. } => Some(url.clone()),
            _ => self.gateway_url.read().await.clone(),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("beacon_app=info".parse().unwrap()),
        )
        .init();

    // Determine data directory
    let data_dir = ProjectDirs::from("dev", "omni", "omni")
        .map(|d| d.data_dir().join("beacon-app"))
        .unwrap_or_else(|| PathBuf::from(".beacon-app"));
    std::fs::create_dir_all(&data_dir).ok();

    tracing::info!(data_dir = %data_dir.display(), "app starting");

    // Default gateway URL (local gateway)
    let default_gateway_url = std::env::var("BEACON_GATEWAY_URL")
        .unwrap_or_else(|_| "http://localhost:18790".to_string());

    let state = Arc::new(AppState {
        gateway_state: RwLock::new(GatewayState::Disconnected),
        gateway_url: RwLock::new(Some(default_gateway_url)),
        sidecar_process: RwLock::new(None),
        data_dir,
    });

    #[allow(unused_mut)]
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_geolocation::init())
        .plugin(tauri_plugin_notification::init());

    // Barcode scanner is mobile-only (crate is gated behind #[cfg(mobile)])
    #[cfg(mobile)]
    {
        builder = builder.plugin(tauri_plugin_barcode_scanner::init());
    }

    builder
        .manage(state.clone())
        .setup(move |app| {
            // Show window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            // Try to connect to gateway or start sidecar
            let state_clone = state.clone();
            tauri::async_runtime::spawn(async move {
                gateway::auto_connect(state_clone).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Gateway management
            get_gateway_status,
            start_gateway,
            stop_gateway,
            // Secure storage
            get_secure_storage,
            set_secure_storage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
