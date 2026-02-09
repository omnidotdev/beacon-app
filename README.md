<div align="center">

# Beacon App

Cross-platform app for Beacon

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE.md)

</div>

## Overview

Beacon App is the unified client for Beacon, supporting web, desktop, and mobile via React and Tauri.

## Features

- **Cross-Platform** - Web, desktop (Windows, macOS, Linux), and mobile (iOS, Android) via Tauri
- **Voice & Text** - Real-time chat with streaming and voice input
- **Persona Switching** - Switch between AI personas on the fly
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

## Building

```bash
# Web
bun build

# Desktop
bun tauri build
```

## License

The code in this repository is licensed under MIT, &copy; [Omni LLC](https://omni.dev). See [LICENSE.md](LICENSE.md) for more information.
