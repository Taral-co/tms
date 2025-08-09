---
mode: agent
tools: [codebase, search, editFiles, runCommands, testingValidation, terminalLastCommand]
description: "Create Go Dockerfile.dev with hot reload — all builds inside Docker (no host build)"
---

# Objective
Create a **Dockerfile.dev** for a Go service that supports **hot reload** and ensures **all compilation and execution happen inside Docker**. No local toolchains required. Provide optional **docker-compose.dev.yml** to run it with volume-mounted caches for fast reloads, plus a minimal **.air.toml** and **.dockerignore**.

# Constraints (must-do)
- **Hot reload** via `air` (cosmtrek/air) inside the container.
- **No host builds**: `go build`, `go mod download`, and `air` must run in the container.
- Non-root user for runtime if feasible.
- Expose and bind on `0.0.0.0:${PORT}` (default 8080).
- Use **named volumes** for `/go/pkg/mod` and `/root/.cache/go-build` to cache modules/build artifacts across restarts.
- Keep image lean (debian/bookworm or alpine is fine; prefer debian for glibc compatibility).
- Do **not** switch to a different process manager; use `air` as the entrypoint/command in dev.
- Do not require copying the entire source at build time for dev. Compose should **mount** the source for live reload; optional initial COPY is OK but not required for rebuilds.

# Inputs (use defaults if absent)
- `service_name`: default `api`
- `main_package`: default `./cmd/api` (adjust if repo shows a different main)
- `port`: default `8080`
- `go_version`: default `1.22`

# Deliverables (exact file paths)
1. **Dockerfile.dev** (repo root)
2. **.air.toml** (repo root) configured to run `go run {{main_package}}` and watch `**/*.go` and `go.mod/go.sum`
3. **.dockerignore** (repo root)
4. **docker-compose.dev.yml** (repo root) with:
   - service `${service_name}` building from `Dockerfile.dev`
   - volume mount `.:/app`
   - named volumes `gomod:/go/pkg/mod` and `gocache:/root/.cache/go-build`
   - port mapping `${port}:${port}`
   - environment `GOFLAGS=-buildvcs=false`, `PORT=${port}`
   - command invoking `air` (or rely on Dockerfile `CMD`)

# File contents (generate with these templates)

## 1) Dockerfile.dev
- Multi-stage optional but keep **single-stage** acceptable for dev.
- Install `air` inside image: `go install github.com/cosmtrek/air@latest` (pin if you can detect a tag).
- Create non-root user `appuser`, workdir `/app`.
- Pre-create cache dirs and set proper permissions.
- Do **NOT** rely on host. All `go mod download` must run in image (can run once with only `go.mod go.sum` to warm cache; source will be mounted by compose).
- Expose `${PORT}` and default to 8080.
- Default `CMD ["air", "-c", ".air.toml"]`.

## 2) .air.toml
- Build: `go run {{main_package}}`
- Watch includes: `**/*.go`, `go.mod`, `go.sum`
- Exclude dirs: `.git`, `vendor`, `node_modules`, `tmp`, `dist`
- Set `bin` temp dir to `/tmp/air`
- Set `app` root to `/app`

## 3) .dockerignore
- Ignore: `.git`, `.idea`, `.vscode`, `bin`, `dist`, `tmp`, `vendor`, `node_modules`, `coverage`, `*.out`, `Dockerfile*` (except `Dockerfile.dev`), `docker-compose*`, `.air.toml` (do **not** ignore; keep it), `.env*`

## 4) docker-compose.dev.yml
- Service `${service_name}`:
  - `build.context: .`
  - `build.dockerfile: Dockerfile.dev`
  - `build.args: [GO_VERSION]`
  - `volumes`: `.:/app:cached`, `gomod:/go/pkg/mod`, `gocache:/root/.cache/go-build`
  - `ports`: `- "${port}:${port}"`
  - `environment`: `PORT=${port}`, `GOFLAGS=-buildvcs=false`
  - `command`: `["air","-c",".air.toml"]`
- `volumes`: `gomod: {}`, `gocache: {}`

# Output format (strict)
1) **Plan** — bullets describing detected main package and port, and what files will be created.
2) **Patches** — create/replace the four files with full contents (no placeholders left).
3) **Run/Validate** — commands to start and verify hot reload:
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   # edit any .go file; confirm auto-reload
   curl -sf http://localhost:${port}/health || true
````

4. **Notes** — how to change `main_package`, `port`, or `go_version`.

# Hints for detection (use the repo)

* If `./cmd/*/main.go` exists, prefer that folder as `main_package`.
* If a `PORT` constant or env lookup exists in code, default to it.
* If a Makefile exists, reflect its run target in `.air.toml` if it is the standard entrypoint.

# Now do it

Generate the four files and ensure they work together for container-only dev with hot reload. If anything is ambiguous, make one concise assumption and proceed.
