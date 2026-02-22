# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Visibility into your complete Claude Code setup — see everything configured across all levels, understand the effective merged state, and discover gaps in your setup without manually hunting through folders.
**Current focus:** Gap closure phase complete. Dashboard types aligned with server response shapes.

## Current Position

Phase: 7 of 7 (Dashboard Type Fixes) -- COMPLETE
Plan: 1 of 1 in current phase (07-01 complete)
Status: Complete
Last activity: 2026-02-22 — Completed 07-01-PLAN.md

Progress: ██████████ 100% (20 of 20 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 20
- Average duration: ~1 session
- Total execution time: 20 sessions

**By Phase:**

| Phase | Plans | Complete | Status |
|-------|-------|----------|--------|
| 1. Foundation | 2 | 2 | Complete |
| 2. Settings + CLAUDE.md | 3 | 3 | Complete |
| 3. MCP + Hooks + Permissions | 3 | 3 | Complete |
| 4. Web Dashboard | 4 | 4 | Complete |
| 5. Advanced Features | 4 | 4 | Complete |
| 6. Polish + Launch | 2 | 2 | Complete |
| 7. Dashboard Type Fixes | 1 | 1 | Complete |

**Recent Trend:**
- Last 5 plans: 05-04, 06-01, 06-02, 07-01
- Trend: Steady, gap closure complete

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Used `jsonc-parser` (Microsoft's VS Code parser) for JSONC parsing — handles comments and trailing commas natively
- Scanner reads files in parallel with `Promise.all` — each file independent, one failure never crashes scan
- Credentials.json content is never read — only existence is reported (security)
- Cross-platform home directory via `os.homedir()` with USERPROFILE/HOME env var fallbacks
- Managed scope path: platform-specific (Windows: %PROGRAMDATA%, macOS: /Library/Application Support, Linux: /etc)
- Command registration pattern: exported function takes Commander program, registers subcommand
- Formatter dispatch pattern: `formatScan(result, json)` routes to table or JSON formatter
- Output via `process.stdout.write` (not `console.log`) for clean piped output
- Vitest for test framework — ESM-native, zero config with TypeScript
- Settings scope priority as array index: managed=0, user=1, project=2, local=3
- No deep merge of nested settings objects — each key treated as opaque value
- Permissions use deny > ask > allow priority merge — deny always wins regardless of scope
- Hono framework for HTTP server — lightweight, TypeScript-native, familiar API
- Build order: tsup (clean:true wipes dist/) then vite (adds dist/dashboard/) — order is critical
- Plugin MCP discovery: reads enabledPlugins from settings, resolves .mcp.json from ~/.claude/plugins/marketplaces/
- @import pattern matches @path.md outside code blocks, skipping email-like references
- Import chain traversal limited to 5 levels (matches Claude Code limit)
- Health category weights: Memory 30%, Settings 25%, MCP 20%, Hooks 15%, Permissions 10%
- Health grade thresholds: A (90+), B (75-89), C (60-74), D (40-59), F (<40)
- Health resolver works from ScanResult data — no additional file reads needed
- Discovery is lightweight (file existence checks only) — full scan only runs during comparison
- Max 10 projects for cross-project comparison to prevent memory issues
- Comparison entries grouped by config type (setting, mcp, hook, permission, memory)
- API endpoints for workspace features use query params since paths are user-provided
- CSS-only circular gauge (conic-gradient) for health score display — no charting library
- ProjectsPage uses discovery/comparison modes in a single page component
- MemoryPage fetches imports alongside memory data in parallel
- Test paths use path.join() for cross-platform normalization — string literals with / fail on Windows
- CI matrix: 3 OS x 3 Node versions, fail-fast disabled, npm ci for reproducible builds
- Test helpers create mock data inline (makeFile, makeSettingsFile, makeScanResult) — no external fixtures
- npm files whitelist limits tarball to dist/, LICENSE, README.md — no source/test/planning files ship
- .npmignore provides defense-in-depth alongside the files field
- prepublishOnly script enforces build + test before any npm publish
- Repository URLs use placeholder USER for owner to fill in after GitHub setup
- Dashboard types must exactly match server-side types — api.ts is the bridge, not an independent schema
- Command vs skill detection uses name.includes(":") — no type field needed on CommandEntry

### Key Files Established

- `src/scanner/index.ts` — Core `scan()` function, re-exports all scanner modules
- `src/scanner/types.ts` — ConfigScope, ConfigFileType, ConfigFile, ScanResult
- `src/index.ts` — CLI entry point with Commander.js, registers all commands including health
- `src/health/types.ts` — HealthCheck, HealthCategory, HealthResult type definitions
- `src/health/resolver.ts` — computeHealth() scoring engine with 5 categories and 9 checks
- `src/commands/health.ts` — healthCommand() registers health subcommand
- `src/formatters/health.ts` — Health table formatter with score bar and JSON passthrough
- `src/formatters/index.ts` — Dispatch functions for all formatters including formatHealth()
- `src/memory/types.ts` — MemoryImport, ResolvedMemoryFile, MemoryImportResult type definitions
- `src/memory/resolver.ts` — resolveMemoryImports() with @import parsing and chain traversal
- `src/workspace/types.ts` — ProjectInfo, WorkspaceScan, ComparisonEntry, ComparisonResult
- `src/workspace/discovery.ts` — discoverProjects() scans parent dir for Claude Code projects
- `src/workspace/comparison.ts` — compareProjects() builds cross-project comparison matrix
- `src/commands/compare.ts` — compareCommand() with --discover flag
- `src/formatters/compare.ts` — Discovery table and comparison table formatters
- `src/server/routes.ts` — REST API route handlers (12 endpoints) including /api/projects, /api/compare
- `dashboard/src/App.tsx` — React app root with BrowserRouter and routes for all pages
- `dashboard/src/lib/api.ts` — Typed API client for all server endpoints
- `dashboard/src/pages/HealthPage.tsx` — Health score gauge, category breakdown, recommendations
- `dashboard/src/pages/ProjectsPage.tsx` — Project discovery and cross-project comparison
- `src/scanner/paths.test.ts` — 14 tests for getConfigPaths() and getGlobalClaudeDir()
- `src/permissions/resolver.test.ts` — 11 tests for resolvePermissions() merge logic
- `src/health/resolver.test.ts` — 11 tests for computeHealth() scoring algorithm
- `.github/workflows/ci.yml` — Cross-platform CI with 9-job matrix (3 OS x 3 Node)
- `README.md` — 147-line user documentation with quickstart, CLI reference, dashboard info
- `LICENSE` — MIT license file
- `.npmignore` — Package exclusion list for defense-in-depth

### Pending Todos

None. Project is complete.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-22
Stopped at: Gap closure complete. All 20 plans across 7 phases executed. Dashboard types now match server response shapes.
Resume file: .planning/phases/07-dashboard-type-fixes/07-01-SUMMARY.md
