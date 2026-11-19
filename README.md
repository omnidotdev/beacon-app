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
- **AI Credits** - Managed AI billed against your personal workspace's AI credit balance
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

On the cloud deployment, Beacon bills the signed-in user's personal workspace, like every Omni product bills a workspace. Managed AI usage is metered by the Synapse gateway and charged against that workspace's AI credit balance (held in Aether, 1 credit = $0.01), and its plan sets Beacon's entitlements. Settings shows the personal workspace's plan and balance, read from beacon-gateway (`GET /api/billing/plan`) so it matches what the gateway enforces, with a Buy credits action; when the balance is empty, chat shows an out-of-credits notice. While Aether's card-verified free AI credits offer is live (`GET /card-verification/offer`, read through a server function), out-of-credits and paid-access notices, and Settings for a free workspace out of credits, also show "Add a card to unlock N free AI credits a month", linking to the account hub's AI tab for the personal workspace. A session that names no personal workspace is asked to sign in again (`reauth_required`), since Beacon never bills the user instead. Plans, entitlements, and prices use Beacon's own Aether app (`beacon`), which is fixed in code. Plans and credits are bought and managed on the Omni account hub (`VITE_ACCOUNT_URL`): Upgrade, Manage subscription, and Buy credits open the hub for the personal workspace, which runs checkout or the billing portal and returns to Settings. `VITE_BILLING_URL` (baked in `.env.production`) supplies the prices behind the Upgrade action.

## Building

```bash
# Web
bun build

# Desktop
bun tauri build
```

## License

The code in this repository is licensed under Apache 2.0, &copy; [Omni LLC](https://omni.dev). See [LICENSE.md](LICENSE.md) for more information.
