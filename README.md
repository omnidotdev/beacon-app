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
- **Omni Credits** - Managed AI billed against your Omni credit balance, one pool shared across Omni products
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

On the cloud deployment, managed AI usage is metered by the Synapse gateway and charged against the user's Omni credit balance (one pool shared across Omni, held in Aether, 1 credit = $0.01). Settings shows that pooled balance and a Buy Credits action; when the balance is empty, chat shows an out-of-credits notice linking to Settings. Plans, entitlements, and prices use Beacon's own Aether app (`beacon`), which is fixed in code. Set `VITE_BILLING_URL` and `VITE_SYNAPSE_API_URL` to enable billing in the UI.

## Building

```bash
# Web
bun build

# Desktop
bun tauri build
```

## License

The code in this repository is licensed under Apache 2.0, &copy; [Omni LLC](https://omni.dev). See [LICENSE.md](LICENSE.md) for more information.
