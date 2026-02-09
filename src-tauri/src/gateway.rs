//! Gateway process management
//!
//! Handles starting, stopping, and monitoring the beacon-gateway sidecar

use std::process::{Command, Stdio};
use std::sync::Arc;
use std::time::Duration;

use crate::{AppState, GatewayState};

/// How long to wait for gateway to start
const GATEWAY_STARTUP_TIMEOUT: Duration = Duration::from_secs(10);

/// Try to connect to an existing gateway or start sidecar
pub async fn auto_connect(state: Arc<AppState>) {
    // First, try to connect to configured gateway URL
    let url = state.gateway_url.read().await.clone();

    if let Some(url) = url {
        tracing::info!(url = %url, "checking for existing gateway");

        if probe_gateway(&url).await {
            tracing::info!(url = %url, "connected to existing gateway");
            *state.gateway_state.write().await = GatewayState::Connected {
                url,
                is_sidecar: false,
            };
            return;
        }
    }

    // No existing gateway, try to start sidecar
    tracing::info!("no existing gateway found, attempting to start sidecar");
    if let Err(e) = start_sidecar(&state).await {
        tracing::warn!(error = %e, "failed to start sidecar gateway");
        *state.gateway_state.write().await = GatewayState::Failed {
            error: e.to_string(),
        };
    }
}

/// Start the gateway as a sidecar process
pub async fn start_sidecar(state: &AppState) -> Result<(), String> {
    *state.gateway_state.write().await = GatewayState::Starting;

    // Find the gateway binary
    let gateway_path = find_gateway_binary()?;
    tracing::info!(path = %gateway_path.display(), "starting gateway sidecar");

    // Start the process
    let child = Command::new(&gateway_path)
        .args(["--persona", "orin"])
        .env("BEACON_API_PORT", "18790")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to start gateway: {e}"))?;

    let pid = child.id();
    tracing::info!(pid, "gateway process started");

    // Store the process handle
    *state.sidecar_process.write().await = Some(child);

    // Wait for gateway to be ready
    let url = "http://localhost:18790".to_string();
    let ready = wait_for_gateway(&url, GATEWAY_STARTUP_TIMEOUT).await;

    if ready {
        tracing::info!(url = %url, "gateway sidecar ready");
        *state.gateway_state.write().await = GatewayState::Connected {
            url,
            is_sidecar: true,
        };
        Ok(())
    } else {
        // Gateway failed to start, clean up
        stop_sidecar(state).await;
        *state.gateway_state.write().await = GatewayState::Failed {
            error: "gateway failed to start within timeout".to_string(),
        };
        Err("gateway failed to start within timeout".to_string())
    }
}

/// Stop the sidecar process
pub async fn stop_sidecar(state: &AppState) {
    let mut process = state.sidecar_process.write().await;
    if let Some(mut child) = process.take() {
        tracing::info!("stopping gateway sidecar");

        // Try graceful shutdown first (SIGTERM on Unix)
        #[cfg(unix)]
        {
            let _ = Command::new("kill")
                .args(["-TERM", &child.id().to_string()])
                .status();
            tokio::time::sleep(Duration::from_secs(2)).await;
        }

        // Force kill if still running
        let _ = child.kill();
        let _ = child.wait();

        tracing::info!("gateway sidecar stopped");
    }

    *state.gateway_state.write().await = GatewayState::Disconnected;
}

/// Probe gateway to check if it's running
pub async fn probe_gateway(url: &str) -> bool {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
        .ok();

    let Some(client) = client else {
        return false;
    };

    let health_url = format!("{url}/health");
    match client.get(&health_url).send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// Wait for gateway to become ready
async fn wait_for_gateway(url: &str, timeout: Duration) -> bool {
    let start = std::time::Instant::now();
    let check_interval = Duration::from_millis(100);

    while start.elapsed() < timeout {
        if probe_gateway(url).await {
            return true;
        }
        tokio::time::sleep(check_interval).await;
    }

    false
}

/// Find the gateway binary
fn find_gateway_binary() -> Result<std::path::PathBuf, String> {
    // Check common locations

    // 1. Environment variable
    if let Ok(path) = std::env::var("BEACON_GATEWAY_PATH") {
        let p = std::path::PathBuf::from(path);
        if p.exists() {
            return Ok(p);
        }
    }

    // 2. Sidecar location (relative to app binary)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            // Check various sidecar locations
            let candidates = [
                dir.join("beacon-gateway"),
                dir.join("beacon"),
                dir.join("../Resources/beacon-gateway"),
                dir.join("../Resources/beacon"),
            ];

            for candidate in &candidates {
                if candidate.exists() {
                    return Ok(candidate.clone());
                }
            }
        }
    }

    // 3. System PATH
    if let Ok(output) = std::process::Command::new("which")
        .arg("beacon")
        .output()
    {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(std::path::PathBuf::from(path));
            }
        }
    }

    // 4. Development build location
    let dev_paths = [
        "../../beacon-gateway/target/debug/beacon",
        "../../beacon-gateway/target/release/beacon",
        "../../../services/beacon-gateway/target/debug/beacon",
        "../../../services/beacon-gateway/target/release/beacon",
    ];

    for path in &dev_paths {
        let p = std::path::PathBuf::from(path);
        if p.exists() {
            return Ok(p);
        }
    }

    Err("beacon-gateway binary not found".to_string())
}

/// Health check loop for sidecar monitoring
#[allow(dead_code)]
pub async fn monitor_sidecar(state: Arc<AppState>) {
    const HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(5);

    loop {
        tokio::time::sleep(HEALTH_CHECK_INTERVAL).await;

        let current_state = state.gateway_state.read().await.clone();
        if let GatewayState::Connected { url, is_sidecar: true } = current_state {
            if !probe_gateway(&url).await {
                tracing::warn!("gateway sidecar health check failed");

                // Check if process is still running
                let mut process = state.sidecar_process.write().await;
                if let Some(ref mut child) = *process {
                    match child.try_wait() {
                        Ok(Some(status)) => {
                            tracing::error!(status = ?status, "gateway sidecar exited");
                            *process = None;
                            drop(process);

                            *state.gateway_state.write().await = GatewayState::Failed {
                                error: format!("gateway exited with status: {status:?}"),
                            };

                            // Attempt restart
                            tokio::time::sleep(Duration::from_secs(1)).await;
                            let _ = start_sidecar(&state).await;
                        }
                        Ok(None) => {
                            // Process still running, just a temporary health check failure
                            tracing::debug!("gateway process running but health check failed");
                        }
                        Err(e) => {
                            tracing::error!(error = %e, "failed to check process status");
                        }
                    }
                }
            }
        }
    }
}
