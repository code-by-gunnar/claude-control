---
phase: 03-config-viewers-mcp-hooks-permissions
plan: 01
subsystem: cli
tags: [mcp, commander, chalk, json, secret-masking]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: scanner infrastructure (scan(), ConfigFile, getConfigPaths)
  - phase: 02-config-viewers-settings
    provides: formatter patterns, command registration pattern, settings resolver pattern
provides:
  - MCP types (McpServer, McpDuplicate, McpResult)
  - MCP resolver (extractMcpServers) with secret masking and duplicate detection
  - MCP formatters (formatMcpTable, formatMcpJson)
  - CLI `mcp` command with table and JSON output
  - .mcp.json scanner path at project level
affects: [03-02-hooks-viewer, 04-web-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [mcp-resolver-pattern, secret-masking-pattern]

key-files:
  created:
    - src/mcp/types.ts
    - src/mcp/resolver.ts
    - src/commands/mcp.ts
    - src/formatters/mcp.ts
  modified:
    - src/scanner/paths.ts
    - src/formatters/index.ts
    - src/index.ts

key-decisions:
  - "Two MCP config formats supported: direct (keys at root) and wrapped (under mcpServers key)"
  - "Headers masked if containing ${, starting with sk-, or starting with Bearer; env values always masked"
  - "MCP servers extracted from both .mcp.json files and settings.json mcpServers key"
  - "Servers sorted by scope priority (project first), then alphabetically by name"
  - "Duplicates detected across files, not within same file"

patterns-established:
  - "MCP resolver pattern: extractMcpServers(files) filters+parses+masks+deduplicates"
  - "Secret masking pattern: header values checked for secret indicators, env values always masked"

# Metrics
duration: 8min
completed: 2026-02-22
---

# Plan 03-01: MCP Server Viewer Summary

**`claude-ctl mcp` command listing all MCP servers across scopes with secret masking, duplicate detection, and table/JSON output**

## Performance

- **Duration:** ~8 min
- **Completed:** 2026-02-22
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- MCP servers from .mcp.json and settings.json are discovered and listed
- Both command-type and http-type servers display correctly with details
- Secrets in headers (Bearer, sk-, ${}) and all env values are masked as `***`
- Duplicate server names across scopes produce warnings
- Table and JSON output both work via --json flag

## Task Commits

Each task was committed atomically:

1. **Task 1: Add .mcp.json scanner paths + MCP types + resolver** - `ab797f0` (feat)
2. **Task 2: MCP command + formatters** - `b41938c` (feat)

## Files Created/Modified
- `src/mcp/types.ts` - McpServer, McpDuplicate, McpResult type definitions
- `src/mcp/resolver.ts` - extractMcpServers() with secret masking and duplicate detection
- `src/commands/mcp.ts` - CLI mcp command registration following established pattern
- `src/formatters/mcp.ts` - Table and JSON formatters for MCP data
- `src/scanner/paths.ts` - Added project-level .mcp.json path expectation
- `src/formatters/index.ts` - Added formatMcp dispatch and re-exports
- `src/index.ts` - Registered mcpCommand alongside existing commands

## Decisions Made
- Supported two MCP config formats (direct and wrapped under mcpServers key) for compatibility with different Claude Code config styles
- Header masking uses indicator-based detection (Bearer, sk-, ${) rather than masking all headers, preserving non-secret values for debugging
- Environment variable values are always masked since they frequently contain secrets
- MCP servers extracted from settings.json too (not just .mcp.json) since settings can embed mcpServers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MCP viewer complete, ready for hooks viewer (03-02)
- MCP types and resolver pattern can be referenced by hooks implementation
- Formatter dispatch pattern extended cleanly

---
*Plan: 03-01-mcp-server-viewer*
*Completed: 2026-02-22*
