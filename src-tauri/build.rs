fn main() {
    // Align native library LOAD segments to 16 KiB so the app runs on Android
    // 15+ devices with 16 KiB memory pages (required by Google Play as of Nov
    // 2025). Rust defaults to 4 KiB alignment for Android targets, and Tauri's
    // mobile build sets an env RUSTFLAGS, which makes Cargo ignore any
    // .cargo/config.toml `rustflags`. A build-script link arg is always applied
    // to the cdylib link regardless, so the page size is forced here instead.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("android") {
        println!("cargo:rustc-cdylib-link-arg=-Wl,-z,max-page-size=16384");
    }

    tauri_build::build();
}
