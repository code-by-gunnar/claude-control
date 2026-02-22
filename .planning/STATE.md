# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Visibility into your complete Claude Code setup — see everything configured across all levels, understand the effective merged state, and discover gaps in your setup without manually hunting through folders.
**Current focus:** Phase 4 in progress — Settings, Memory, and MCP viewer pages complete. Next: Hooks and Permissions pages to finish the dashboard.

## Current Position

Phase: 4 of 6 (Web Dashboard) — IN PROGRESS
Plan: 3 of 4 in current phase — COMPLETE
Status: Plan 04-03 complete (Settings, Memory, and MCP viewer pages with expandable details)
Last activity: 2026-02-22 — Three config viewer pages built and verified

Progress: ██████░░░░ 65% (11 of 17 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: ~1 session
- Total execution time: 11 sessions

**By Phase:**

| Phase | Plans | Complete | Status |
|-------|-------|----------|--------|
| 1. Foundation | 2 | 2 | Complete |
| 2. Settings + CLAUDE.md | 3 | 3 | Complete |
| 3. MCP + Hooks + Permissions | 3 | 3 | Complete |
| 4. Web Dashboard | 4 | 3 | In progress |
| 5. Advanced Features | 3 | 0 | Not started |
| 6. Polish + Launch | 2 | 0 | Not started |

**Recent Trend:**
- Last 5 plans: 03-02, 03-03, 04-01, 04-02, 04-03
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
- Credential content stripped from JSON output as defense in depth
- Paths shortened with ~ in table display, full paths in JSON for machine consumption
- Vitest for test framework — ESM-native, zero config with TypeScript
- Settings scope priority as array index: managed=0, user=1, project=2, local=3
- No deep merge of nested settings objects — each key treated as opaque value
- Override chain sorted highest priority first for natural display
- Memory command filters scan results to claude-md type with exists === true
- --show accepts 1-based index or path substring match for flexible file selection
- Error output goes to stderr with non-zero exit code for --show not found
- Settings command filters for type=settings with exists+content before resolver
- --key filter uses case-insensitive substring match
- Override chain uses Unicode box-drawing characters with green winner / dim overridden
- Two MCP config formats supported: direct (keys at root) and wrapped (under mcpServers key)
- Headers masked if containing ${, starting with sk-, or starting with Bearer; env values always masked
- MCP servers extracted from both .mcp.json files and settings.json mcpServers key
- Servers sorted by scope priority (project first), then alphabetically by name
- Duplicates detected across files, not within same file
- Known hook events hardcoded as constant array (6 events), easy to update when new events added
- Skill directories use colon-separated naming (dirname:filename) matching Claude Code convention
- extractCommands is async (filesystem access), extractHooks is sync (works on parsed settings content)
- Permissions use deny > ask > allow priority merge — deny always wins regardless of scope
- Within same rule priority, higher scope wins (local > project > user > managed)
- Permission strings parsed with regex to extract tool name and optional pattern
- --tool filter uses case-insensitive substring match (same pattern as settings --key)
- Hono framework for HTTP server — lightweight, TypeScript-native, familiar API
- Module-level `setProjectDir()` pattern for sharing project directory across API routes
- SPA fallback pre-reads index.html at startup — avoids async reads per request
- Dashboard static files resolved relative to dist entry point (`path.join(__dirname, 'dashboard')`)
- Browser opening uses `child_process.exec` with platform detection — avoids adding `open` dependency
- Server output goes to stderr; CORS enabled globally for development flexibility
- Tailwind v4 with `@tailwindcss/vite` plugin — no postcss.config or tailwind.config needed
- Build order: tsup (clean:true wipes dist/) then vite (adds dist/dashboard/) — order is critical
- API types in frontend match actual server response shapes — discovered through live testing
- Unicode characters for sidebar icons — avoids icon library dependency
- Dark sidebar (slate-900) + light content (slate-50) + blue accents for active nav
- ScopeBadge component duplicated across pages — simple enough to inline, avoids premature abstraction
- Object values show `{...}` in table, full JSON only when expanded — keeps table scannable
- Memory content rendered in `<pre>` with `whitespace-pre-wrap` — preserves markdown without full renderer
- MCP type badges: command=amber, http=cyan — distinct from scope badge colors

### Key Files Established

- `src/scanner/index.ts` — Core `scan()` function, re-exports all scanner modules
- `src/scanner/types.ts` — ConfigScope, ConfigFileType, ConfigFile, ScanResult
- `src/scanner/paths.ts` — `getConfigPaths()` for cross-platform path resolution (all 4 scopes), includes user-level CLAUDE.md and project-level .mcp.json
- `src/scanner/parser.ts` — `parseJsonc()` and `readMarkdown()`
- `src/index.ts` — CLI entry point with Commander.js, registers scan + status + memory + settings + mcp + hooks + commands + permissions + dashboard
- `src/commands/scan.ts` — `scanCommand()` registers scan subcommand
- `src/commands/status.ts` — `statusCommand()` registers status subcommand
- `src/commands/memory.ts` — `memoryCommand()` registers memory subcommand with list and --show modes
- `src/commands/settings.ts` — `settingsCommand()` registers settings subcommand with --key filter
- `src/commands/mcp.ts` — `mcpCommand()` registers mcp subcommand listing MCP servers
- `src/commands/dashboard.ts` — `dashboardCommand()` registers dashboard subcommand with --port and --no-open
- `src/formatters/index.ts` — `formatScan()`, `formatStatus()`, `formatMemory()`, `formatMemoryContent()`, `formatSettings()`, `formatMcp()`, `formatHooks()`, `formatCommands()`, `formatPermissions()` dispatch functions
- `src/formatters/table.ts` — Human-readable table output with chalk colors, memory/settings table formatters
- `src/formatters/json.ts` — JSON output with credential sanitization, memory/settings JSON formatters
- `src/formatters/mcp.ts` — MCP-specific table and JSON formatters with secret masking display
- `src/settings/types.ts` — ScopedSettings, ResolvedSetting, OverrideEntry, SettingsResult
- `src/settings/resolver.ts` — resolveSettings() with scope-priority merge logic
- `src/settings/resolver.test.ts` — 9 test cases for settings resolution
- `src/mcp/types.ts` — McpServer, McpDuplicate, McpResult type definitions
- `src/mcp/resolver.ts` — extractMcpServers() with secret masking and duplicate detection
- `src/hooks/types.ts` — HookEntry, HookMatcher, HookEvent, CommandEntry, HooksResult, CommandsResult
- `src/hooks/resolver.ts` — extractHooks() and extractCommands() resolver functions
- `src/commands/hooks.ts` — `hooksCommand()` registers hooks subcommand with event catalog
- `src/commands/commands.ts` — `commandsCommand()` registers commands subcommand
- `src/formatters/hooks.ts` — Hooks and commands table/JSON formatters
- `src/permissions/types.ts` — PermissionEntry, EffectivePermission, PermissionsResult type definitions
- `src/permissions/resolver.ts` — resolvePermissions() with deny > ask > allow priority merge
- `src/commands/permissions.ts` — `permissionsCommand()` registers permissions subcommand with --tool filter
- `src/formatters/permissions.ts` — Permissions table and JSON formatters with override chain display
- `src/server/index.ts` — Hono server setup with CORS, static file serving, SPA fallback
- `src/server/routes.ts` — REST API route handlers (8 endpoints) calling existing resolvers
- `dashboard/vite.config.ts` — Vite config with React + Tailwind v4 plugins, build to dist/dashboard
- `dashboard/src/App.tsx` — React app root with BrowserRouter and routes (Settings, Memory, MCP wired)
- `dashboard/src/components/Layout.tsx` — Dashboard shell with sidebar and content area
- `dashboard/src/components/Sidebar.tsx` — Navigation sidebar with 6 NavLink items
- `dashboard/src/pages/OverviewPage.tsx` — Overview page with 6 live summary cards
- `dashboard/src/pages/SettingsPage.tsx` — Settings viewer with expandable override chains and filter
- `dashboard/src/pages/MemoryPage.tsx` — CLAUDE.md file list with expandable content viewer
- `dashboard/src/pages/McpPage.tsx` — MCP servers list with expandable details and duplicate warnings
- `dashboard/src/lib/api.ts` — Typed API client for all server endpoints

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-22
Stopped at: Phase 4 plan 03 complete. Settings, Memory, and MCP viewer pages working with live data. Ready for plan 04-04.
Resume file: .planning/phases/04-web-dashboard/04-03-SUMMARY.md
