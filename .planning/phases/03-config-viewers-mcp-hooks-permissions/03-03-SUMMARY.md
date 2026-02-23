---
phase: 03-config-viewers-mcp-hooks-permissions
plan: 03
subsystem: cli
tags: [permissions, deny-ask-allow, merge-priority, override-chain, chalk, formatter]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Scanner engine, ConfigFile types, scan() function"
  - phase: 02-config-viewers
    provides: "Settings resolver pattern, override chain display pattern"
provides:
  - "permissions command showing merged permissions with deny > ask > allow priority"
  - "PermissionEntry, EffectivePermission, PermissionsResult types"
  - "resolvePermissions() with rule priority and scope-aware merge"
affects: [web-dashboard, advanced-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Rule priority merge: deny > ask > allow across scopes"
    - "Permission string parsing: ToolName or ToolName(pattern) format"

key-files:
  created:
    - "src/permissions/types.ts"
    - "src/permissions/resolver.ts"
    - "src/commands/permissions.ts"
    - "src/formatters/permissions.ts"
  modified:
    - "src/formatters/index.ts"
    - "src/index.ts"

key-decisions:
  - "Permissions use deny > ask > allow priority merge (deny always wins regardless of scope)"
  - "Within same rule priority, higher scope wins (local > project > user > managed)"
  - "Permission strings parsed with regex /^([^(]+?)(?:\\((.+)\\))?$/ to extract tool name and optional pattern"
  - "--tool filter uses case-insensitive substring match (same pattern as settings --key)"

patterns-established:
  - "Rule priority merge: separate from scope priority, rule type (deny/ask/allow) takes precedence over scope level"
  - "Permission string parsing: handles MCP tool names and complex patterns inside parentheses"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 3 Plan 03: Permissions Audit Summary

**Permissions viewer with deny > ask > allow priority merge, origin tracking, and override chains**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22
- **Completed:** 2026-02-22
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `claude-ctl permissions` shows all permissions extracted from settings files with effective rule, source scope, and origin path
- Merge logic correctly applies deny > ask > allow priority (deny always wins)
- Within same priority level, higher scope wins (local > project > user > managed)
- Override chains display when same tool+pattern configured at multiple scopes
- `--tool` filter supports case-insensitive substring matching
- `--json` output provides full machine-readable data with all entries and effective permissions
- Footer shows summary counts (N allow, N deny, N ask)

## Task Commits

Each task was committed atomically:

1. **Task 1: Permissions types + resolver with scope-aware merge** - `0501970` (feat)
2. **Task 2: Permissions command + formatters with CLI wiring** - `88992d9` (feat)

## Files Created/Modified
- `src/permissions/types.ts` - PermissionEntry, EffectivePermission, PermissionsResult type definitions
- `src/permissions/resolver.ts` - resolvePermissions() with rule priority and scope-aware merge logic
- `src/commands/permissions.ts` - CLI permissions command with --tool filter
- `src/formatters/permissions.ts` - Table and JSON formatters with override chain display
- `src/formatters/index.ts` - Added formatPermissions dispatch function and re-exports
- `src/index.ts` - Registered permissions command

## Decisions Made
- Permissions use deny > ask > allow priority merge -- deny always wins regardless of scope (matches Claude Code's actual behavior)
- Within same rule priority, higher scope wins (local > project > user > managed) -- consistent with settings resolver
- Permission strings parsed with regex to extract tool name and optional pattern -- handles MCP tool names and complex patterns
- --tool filter uses case-insensitive substring match -- same pattern as settings --key filter for consistency

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 3 complete: MCP, hooks, commands, and permissions viewers all implemented
- All config viewer commands available: scan, status, memory, settings, mcp, hooks, commands, permissions
- Ready for Phase 4 (Web Dashboard) which will consume these resolver outputs
- No blockers or concerns

---
*Phase: 03-config-viewers-mcp-hooks-permissions*
*Completed: 2026-02-22*
