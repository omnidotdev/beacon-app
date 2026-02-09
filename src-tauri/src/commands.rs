//! Tauri IPC commands
//!
//! These commands are minimal - most functionality is provided by the
//! beacon-gateway over HTTP/WebSocket. The app mainly handles:
//! - Gateway connection management
//! - Secure storage for device identity
//! - Native OS integrations

use std::collections::HashMap;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::{gateway, AppState, GatewayState};

// === Gateway Management ===

/// Gateway status response
#[derive(Debug, Serialize)]
pub struct GatewayStatus {
    pub state: String,
    pub url: Option<String>,
    pub is_sidecar: bool,
    pub error: Option<String>,
}

/// Get current gateway connection status
#[tauri::command]
pub async fn get_gateway_status(state: State<'_, Arc<AppState>>) -> Result<GatewayStatus, String> {
    let gateway_state = state.gateway_state.read().await;

    Ok(match &*gateway_state {
        GatewayState::Disconnected => GatewayStatus {
            state: "disconnected".to_string(),
            url: None,
            is_sidecar: false,
            error: None,
        },
        GatewayState::Starting => GatewayStatus {
            state: "starting".to_string(),
            url: None,
            is_sidecar: true,
            error: None,
        },
        GatewayState::Connected { url, is_sidecar } => GatewayStatus {
            state: "connected".to_string(),
            url: Some(url.clone()),
            is_sidecar: *is_sidecar,
            error: None,
        },
        GatewayState::Failed { error } => GatewayStatus {
            state: "failed".to_string(),
            url: None,
            is_sidecar: false,
            error: Some(error.clone()),
        },
    })
}

/// Start gateway request
#[derive(Debug, Deserialize)]
pub struct StartGatewayRequest {
    /// Optional URL to connect to (if not provided, starts sidecar)
    pub url: Option<String>,
}

/// Start or connect to gateway
#[tauri::command]
pub async fn start_gateway(
    state: State<'_, Arc<AppState>>,
    request: Option<StartGatewayRequest>,
) -> Result<GatewayStatus, String> {
    let request = request.unwrap_or(StartGatewayRequest { url: None });

    if let Some(url) = request.url {
        // Connect to external gateway
        tracing::info!(url = %url, "connecting to external gateway");

        if gateway::probe_gateway(&url).await {
            *state.gateway_state.write().await = GatewayState::Connected {
                url: url.clone(),
                is_sidecar: false,
            };
            *state.gateway_url.write().await = Some(url.clone());

            Ok(GatewayStatus {
                state: "connected".to_string(),
                url: Some(url),
                is_sidecar: false,
                error: None,
            })
        } else {
            Err(format!("failed to connect to gateway at {url}"))
        }
    } else {
        // Start sidecar
        gateway::start_sidecar(&state).await?;
        get_gateway_status(state).await
    }
}

/// Stop gateway (only affects sidecar)
#[tauri::command]
pub async fn stop_gateway(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    gateway::stop_sidecar(&state).await;
    Ok(())
}

// === Secure Storage ===

// Simple in-memory storage for now
// In production, use the platform's keychain
static SECURE_STORAGE: std::sync::LazyLock<std::sync::Mutex<HashMap<String, String>>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new(HashMap::new()));

/// Get a value from secure storage
#[tauri::command]
pub async fn get_secure_storage(key: String) -> Result<Option<String>, String> {
    let storage = SECURE_STORAGE
        .lock()
        .map_err(|e| format!("storage lock failed: {e}"))?;

    Ok(storage.get(&key).cloned())
}

/// Set a value in secure storage
#[tauri::command]
pub async fn set_secure_storage(key: String, value: String) -> Result<(), String> {
    let mut storage = SECURE_STORAGE
        .lock()
        .map_err(|e| format!("storage lock failed: {e}"))?;

    storage.insert(key, value);
    Ok(())
}
