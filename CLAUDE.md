# CLAUDE.md

Project context for Claude Code when working in this repository.

## What This Is

`claude-ctl` — a CLI + web dashboard for inspecting Claude Code configuration files across all scope levels (managed, user, project, local). Scans config files, resolves settings with override chains, and displays everything in terminal or browser.

## Tech Stack

- **Runtime**: Node.js 18+ (ESM-only)
- **Language**: TypeScript (strict mode)
- **CLI**: Commander.js
- **Web server**: Hono + @hono/node-server
- **Dashboard**: React 19 + React Router + Tailwind CSS v4 + Vite 7
- **Build**: tsup (CLI → dist/index.js) then Vite (dashboard → dist/dashboard/)
- **Test**: Vitest
- **Linting**: None yet (planned for Phase 6)

## Architecture

```
src/                    # CLI + server (TypeScript, built by tsup)
  scanner/              # File discovery and parsing (paths, parser, types)
  settings/             # Settings resolver with scope-priority merge
  mcp/                  # MCP server extraction with secret masking
  hooks/                # Hook and command extraction
  permissions/          # Permission resolver (deny > ask > allow)
  commands/             # CLI subcommand registrations
  formatters/           # Table (chalk) and JSON output formatters
  server/               # Hono HTTP server + REST API routes
dashboard/              # React SPA (built by Vite)
  src/components/       # Layout, Sidebar
  src/pages/            # One page per config area
  src/lib/api.ts        # Typed fetch client for all API endpoints
```

### Data Flow

1. `scan(projectDir)` discovers all config file paths and reads them in parallel
2. Resolvers (`resolveSettings`, `extractMcpServers`, etc.) process scan results
3. CLI formatters or API routes return the resolved data

### Build Order (Critical)

tsup runs first with `clean: true` (wipes dist/), then Vite adds dist/dashboard/. Reversing this order deletes the dashboard build.

## Conventions

### Code Style

- ESM imports with `.js` extensions (required for Node ESM resolution)
- No default exports — use named exports everywhere
- Commands registered via `export function fooCommand(program: Command): void`
- Formatters dispatch via `formatFoo(data, projectDir, json)` pattern
- Output via `process.stdout.write()`, not `console.log()`
- Errors to stderr with `process.stderr.write()`

### Types

- Scanner types in `src/scanner/types.ts` — ConfigScope, ConfigFile, ScanResult
- Each domain has its own `types.ts` (mcp/types.ts, hooks/types.ts, etc.)
- Dashboard API types in `dashboard/src/lib/api.ts`

### Commit Messages

Conventional commits format:
- `feat(phase-plan): description` — new feature
- `fix(phase-plan): description` — bug fix
- `test(phase-plan): description` — test additions
- `refactor(phase-plan): description` — refactoring
- `docs(phase): description` — documentation/planning

### Scope Priority

Settings and permissions use scope priority (higher number wins):
- managed (0) → user (1) → project (2) → local (3)

Permissions use a different merge: deny always wins regardless of scope, then ask > allow.

### Secret Masking

- Environment variable values: always masked as `***`
- Headers: masked if containing `${`, starting with `sk-`, or starting with `Bearer`
- Credential file content: never read, only existence reported

## Commands

```bash
npm run build          # Build CLI + dashboard
npm test               # Run tests (vitest)
node dist/index.js     # Run CLI directly
node dist/index.js dashboard --port 3737  # Start web dashboard
```

## Key Decisions

- No deep merge of nested settings — each key is an opaque value
- Plugin MCP servers discovered from `~/.claude/plugins/marketplaces/`
- Tailwind v4 with `@tailwindcss/vite` — no config files needed
- Inline SVG icons (Heroicons paths) — no icon library dependency
- SPA fallback reads index.html once at startup
- CORS enabled globally on the API server
