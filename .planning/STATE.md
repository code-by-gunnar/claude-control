# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** Visibility into your complete Claude Code setup — see everything configured across all levels, understand the effective merged state, and discover gaps in your setup without manually hunting through folders.
**Current focus:** Phase 3 in progress — MCP server viewer complete, hooks and permissions viewers next

## Current Position

Phase: 3 of 6 (Config Viewers — MCP + Hooks + Permissions) — IN PROGRESS
Plan: 03-01 complete, 03-02 and 03-03 remaining
Status: Plan 03-01 (MCP Server Viewer) complete
Last activity: 2026-02-22 — Plan 03-01 complete with `claude-ctl mcp` command

Progress: ████░░░░░░ 35% (6 of 17 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~1 session
- Total execution time: 6 sessions

**By Phase:**

| Phase | Plans | Complete | Status |
|-------|-------|----------|--------|
| 1. Foundation | 2 | 2 | Complete |
| 2. Settings + CLAUDE.md | 3 | 3 | Complete |
| 3. MCP + Hooks + Permissions | 3 | 1 | In progress |
| 4. Web Dashboard | 4 | 0 | Not started |
| 5. Advanced Features | 3 | 0 | Not started |
| 6. Polish + Launch | 2 | 0 | Not started |

**Recent Trend:**
- Last 5 plans: 01-02, 02-01, 02-02, 02-03, 03-01
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

### Key Files Established

- `src/scanner/index.ts` — Core `scan()` function, re-exports all scanner modules
- `src/scanner/types.ts` — ConfigScope, ConfigFileType, ConfigFile, ScanResult
- `src/scanner/paths.ts` — `getConfigPaths()` for cross-platform path resolution (all 4 scopes), includes user-level CLAUDE.md and project-level .mcp.json
- `src/scanner/parser.ts` — `parseJsonc()` and `readMarkdown()`
- `src/index.ts` — CLI entry point with Commander.js, registers scan + status + memory + settings + mcp commands
- `src/commands/scan.ts` — `scanCommand()` registers scan subcommand
- `src/commands/status.ts` — `statusCommand()` registers status subcommand
- `src/commands/memory.ts` — `memoryCommand()` registers memory subcommand with list and --show modes
- `src/commands/settings.ts` — `settingsCommand()` registers settings subcommand with --key filter
- `src/commands/mcp.ts` — `mcpCommand()` registers mcp subcommand listing MCP servers
- `src/formatters/index.ts` — `formatScan()`, `formatStatus()`, `formatMemory()`, `formatMemoryContent()`, `formatSettings()`, `formatMcp()` dispatch functions
- `src/formatters/table.ts` — Human-readable table output with chalk colors, memory/settings table formatters
- `src/formatters/json.ts` — JSON output with credential sanitization, memory/settings JSON formatters
- `src/formatters/mcp.ts` — MCP-specific table and JSON formatters with secret masking display
- `src/settings/types.ts` — ScopedSettings, ResolvedSetting, OverrideEntry, SettingsResult
- `src/settings/resolver.ts` — resolveSettings() with scope-priority merge logic
- `src/settings/resolver.test.ts` — 9 test cases for settings resolution
- `src/mcp/types.ts` — McpServer, McpDuplicate, McpResult type definitions
- `src/mcp/resolver.ts` — extractMcpServers() with secret masking and duplicate detection

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-22
Stopped at: Plan 03-01 complete. MCP server viewer working. Ready for plan 03-02 (hooks viewer).
Resume file: .planning/phases/03-config-viewers-mcp-hooks-permissions/03-01-SUMMARY.md
