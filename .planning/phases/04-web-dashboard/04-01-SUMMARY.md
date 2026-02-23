# Plan 04-01 Summary: API Server + Dashboard Command

## Result: COMPLETE

**Phase:** 04-web-dashboard
**Plan:** 01 of 04
**Date:** 2026-02-22

## Objective

Set up Hono web server with REST API exposing all scanner/resolver data, and add `dashboard` CLI command.

## Tasks Completed

### Task 1: Create Hono server with REST API routes
- Installed `hono` and `@hono/node-server` as production dependencies
- Created `src/server/routes.ts` with 8 API endpoints:
  - `GET /api/scan` — full ScanResult
  - `GET /api/status` — summary counts
  - `GET /api/settings` — resolved settings with override chain
  - `GET /api/memory` — CLAUDE.md files with content
  - `GET /api/mcp` — MCP servers with duplicate detection
  - `GET /api/hooks` — configured hooks with event catalog
  - `GET /api/commands` — custom slash commands and skills
  - `GET /api/permissions` — resolved permissions with deny > ask > allow merge
- Created `src/server/index.ts` with Hono app setup, CORS middleware, static file serving, and SPA fallback
- Module-level `setProjectDir()` pattern for sharing project directory across routes
- Commit: `feat(04-01): add Hono web server with REST API routes`

### Task 2: Add dashboard CLI command
- Created `src/commands/dashboard.ts` with:
  - `claude-ctl dashboard [project-dir]` command
  - `--port <number>` option (default: 3737)
  - `--no-open` option to skip browser auto-open
  - Platform-specific browser opening via `child_process.exec`
  - Graceful shutdown on SIGINT/SIGTERM
- Registered in `src/index.ts` as 9th command (alongside existing 8)
- Commit: `feat(04-01): add dashboard CLI command with server startup`

## Verification

- [x] `npm run build` succeeds without TypeScript errors
- [x] `npx tsc --noEmit` passes with zero errors
- [x] `node dist/index.js --help` shows dashboard command in help text
- [x] `node dist/index.js dashboard --no-open` starts server on port 3737
- [x] `GET /api/scan` returns valid JSON ScanResult
- [x] `GET /api/status` returns valid JSON summary
- [x] `GET /api/settings` returns valid JSON SettingsResult
- [x] `GET /api/memory` returns valid JSON array
- [x] `GET /api/mcp` returns valid JSON McpResult
- [x] `GET /api/hooks` returns valid JSON HooksResult
- [x] `GET /api/commands` returns valid JSON CommandsResult
- [x] `GET /api/permissions` returns valid JSON PermissionsResult
- [x] SPA fallback returns 404 JSON when dashboard not built
- [x] Existing CLI commands still work (no regressions)

## Artifacts

| File | Lines | Purpose |
|------|-------|---------|
| `src/server/routes.ts` | 119 | REST API route handlers calling existing resolvers |
| `src/server/index.ts` | 84 | Hono server setup with CORS, static serving, SPA fallback |
| `src/commands/dashboard.ts` | 80 | CLI dashboard command with server startup |
| `src/index.ts` | 33 | Updated CLI entry point (added dashboard import + registration) |

## Decisions

- Used Hono framework for HTTP server — lightweight, TypeScript-native, familiar API
- Module-level `setProjectDir()` pattern rather than passing through middleware context — simpler for this use case
- SPA fallback pre-reads `index.html` at startup via `fs.readFileSync` — avoids async reads per request
- Dashboard static files resolved relative to dist entry point (`path.join(__dirname, 'dashboard')`) — will be adjacent after build
- Browser opening uses `child_process.exec` with platform detection — avoids adding `open` npm dependency
- Server output goes to stderr to avoid polluting piped output
- CORS enabled globally for development flexibility (React dev server on different port)

## Dependencies Added

- `hono` — HTTP framework
- `@hono/node-server` — Node.js adapter for Hono (includes `serve` and `serveStatic`)
