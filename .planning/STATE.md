# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Visibility into your complete Claude Code setup — see everything configured across all levels, understand the effective merged state, and discover gaps in your setup without manually hunting through folders.
**Current focus:** Phase 5 in progress — Import tracing (05-01), health score (05-02), cross-project comparison (05-03) all complete. Dashboard integration (05-04) pending.

## Current Position

Phase: 5 of 6 (Advanced Features)
Plan: 3 of 4 in current phase (05-01, 05-02, 05-03 complete; 05-04 pending)
Status: In progress
Last activity: 2026-02-22 — Completed 05-03-PLAN.md

Progress: █████████░ 89% (16 of 18 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: ~1 session
- Total execution time: 16 sessions

**By Phase:**

| Phase | Plans | Complete | Status |
|-------|-------|----------|--------|
| 1. Foundation | 2 | 2 | Complete |
| 2. Settings + CLAUDE.md | 3 | 3 | Complete |
| 3. MCP + Hooks + Permissions | 3 | 3 | Complete |
| 4. Web Dashboard | 4 | 4 | Complete |
| 5. Advanced Features | 4 | 3 (+05-03) | In progress |
| 6. Polish + Launch | 2 | 0 | Not started |

**Recent Trend:**
- Last 5 plans: 04-04, 05-01, 05-02, 05-03
- Trend: Steady

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

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 05-03-PLAN.md (cross-project comparison). 05-04 (dashboard integration) is next.
Resume file: .planning/phases/05-advanced-features/05-03-SUMMARY.md
