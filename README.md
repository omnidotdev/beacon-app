<div align="center">

# Beacon App

Cross-platform app for Beacon

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE.md)

</div>

## Overview

Beacon App is the unified client for Beacon, supporting web, desktop, and mobile via React and Tauri.

## Features

- **Cross-Platform** - Web, desktop (Windows, macOS, Linux), and mobile (iOS, Android) via Tauri
- **Voice & Text** - Real-time chat with streaming and voice input
- **Persona Switching** - Switch between AI personas on the fly
- **Omni Credits** - Managed AI billed against your personal workspace's Omni credit balance
- **BYOK** - Bring your own API keys for LLM providers
- **Offline Support** - Local-first with IndexedDB via Dexie

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Rust](https://rustup.rs) 1.85+ (for Tauri desktop/mobile)

## Development

```bash
# Web
bun i
bun dev

# Desktop
bun tauri dev

# Mobile
bun android:dev
bun ios:dev
```

## Billing

On the cloud deployment, Beacon bills the signed-in user's personal workspace, like every Omni product bills a workspace. Managed AI usage is metered by the Synapse gateway and charged against that workspace's Omni credit balance (held in Aether, 1 credit = $0.01), and its plan sets Beacon's entitlements. Settings shows the personal workspace's plan and balance, read from beacon-gateway (`GET /api/billing/plan`) so it matches what the gateway enforces, with a Buy credits action; when the balance is empty, chat shows an out-of-credits notice. Plans, entitlements, and prices use Beacon's own Aether app (`beacon`), which is fixed in code. Plans and credits are bought and managed on the Omni account hub (`VITE_ACCOUNT_URL`): Upgrade, Manage subscription, and Buy credits open the hub for the personal workspace, which runs checkout or the billing portal and returns to Settings. Set `VITE_BILLING_URL` to enable billing in the UI.

## Building

```bash
# Web
bun build

# Desktop
bun tauri build
```

## License

The code in this repository is licensed under Apache 2.0, &copy; [Omni LLC](https://omni.dev). See [LICENSE.md](LICENSE.md) for more information.
