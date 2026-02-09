# Beacon App Development

load("ext://dotenv", "dotenv")

# Load environment from metarepo
env_file = "../../.env.local"
if os.path.exists(env_file):
    dotenv(fn=env_file)

project_name = "beacon-app"

# Run the frontend dev server
local_resource(
    "dev-%s-frontend" % project_name,
    serve_cmd="bun run dev",
    deps=["src", "package.json"],
    labels=[project_name],
)

# Run the Tauri desktop app (depends on frontend)
local_resource(
    "dev-%s-desktop" % project_name,
    serve_cmd="bun tauri dev",
    serve_dir=".",
    deps=["src-tauri/src"],
    resource_deps=["dev-%s-frontend" % project_name],
    labels=[project_name],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# Build Rust backend
local_resource(
    "build-%s" % project_name,
    cmd="cd src-tauri && cargo build",
    deps=["src-tauri/src", "src-tauri/Cargo.toml"],
    labels=[project_name],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# Type check
local_resource(
    "typecheck-%s" % project_name,
    cmd="bun run typecheck",
    deps=["src", "tsconfig.json"],
    labels=[project_name],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
)

# Lint
local_resource(
    "lint-%s" % project_name,
    cmd="bun check",
    deps=["src", "biome.json"],
    labels=[project_name],
    auto_init=False,
    trigger_mode=TRIGGER_MODE_MANUAL,
)
