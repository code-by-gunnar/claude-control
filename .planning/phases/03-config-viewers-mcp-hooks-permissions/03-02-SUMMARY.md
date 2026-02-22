---
phase: 03-config-viewers-mcp-hooks-permissions
plan: 02
subsystem: cli
tags: [hooks, commands, skills, event-catalog, chalk, formatter]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "Scanner engine, ConfigFile types, scan() function"
  - phase: 03-01
    provides: "MCP resolver pattern, mcp.ts formatter pattern"
provides:
  - "hooks command showing configured hooks with event catalog"
  - "commands command listing custom slash commands/skills"
  - "HookEvent, HookMatcher, HookEntry, CommandEntry types"
  - "extractHooks() and extractCommands() resolver functions"
affects: [web-dashboard, advanced-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Event catalog pattern: known events vs configured status"
    - "Commands directory traversal with skill subdirectory support"

key-files:
  created:
    - "src/hooks/types.ts"
    - "src/hooks/resolver.ts"
    - "src/commands/hooks.ts"
    - "src/commands/commands.ts"
    - "src/formatters/hooks.ts"
  modified:
    - "src/formatters/index.ts"
    - "src/index.ts"

key-decisions:
  - "Known hook events hardcoded as constant: PreToolUse, PostToolUse, Notification, Stop, SubagentStop, SessionStart"
  - "Skill directories use colon-separated naming: dirname:filename (e.g., gsd:execute-plan)"
  - "extractCommands is async (reads directories at runtime), extractHooks is sync (works on parsed settings content)"

patterns-established:
  - "Event catalog pattern: show all known events with configured vs unconfigured checkmarks"
  - "Directory-based resolver: read filesystem for commands directories, unlike settings/hooks which work from parsed JSON"

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 3 Plan 02: Hooks + Commands Viewer Summary

**Hooks viewer with event catalog and custom commands/skills listing from commands directories**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T16:43:39Z
- **Completed:** 2026-02-22T16:46:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- `claude-ctl hooks` shows all configured hooks grouped by event with matchers, commands, scope, and source path
- Event catalog displays all 6 known hook events with configured/unconfigured status
- `claude-ctl commands` lists all custom slash commands and skills with name, scope, and path
- Both commands support `--json` output for machine consumption
- Skill subdirectories traversed and displayed with colon-separated naming (e.g., gsd:execute-plan)

## Task Commits

Each task was committed atomically:

1. **Task 1: Hooks types + resolver with event catalog** - `d60ba52` (feat)
2. **Task 2: Hooks + commands CLI commands and formatters** - `6f10204` (feat)

## Files Created/Modified
- `src/hooks/types.ts` - HookEntry, HookMatcher, HookEvent, CommandEntry, HooksResult, CommandsResult type definitions
- `src/hooks/resolver.ts` - extractHooks() and extractCommands() resolver functions
- `src/commands/hooks.ts` - CLI hooks command registration
- `src/commands/commands.ts` - CLI commands command registration
- `src/formatters/hooks.ts` - Table and JSON formatters for hooks and commands
- `src/formatters/index.ts` - Added formatHooks and formatCommands dispatch functions and re-exports
- `src/index.ts` - Registered hooks and commands commands

## Decisions Made
- Known hook events hardcoded as constant array (6 events) -- matches Claude Code's current event types, easy to update when new events are added
- Skill directories use colon-separated naming (dirname:filename) -- follows Claude Code's own convention for namespaced commands
- extractCommands is async (needs filesystem access for directory reading) while extractHooks is sync (works on already-parsed settings content)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Hooks and commands viewers complete, ready for plan 03-03 (permissions audit)
- All established patterns (resolver, formatter, command registration) available for permissions viewer
- No blockers or concerns

---
*Phase: 03-config-viewers-mcp-hooks-permissions*
*Completed: 2026-02-22*
