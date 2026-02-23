---
phase: 02-config-viewers-settings
plan: 02
subsystem: ui
tags: [cli, chalk, formatter, memory, claude-md]

requires:
  - phase: 01-foundation
    provides: "Scanner infrastructure (scan(), getConfigPaths, ConfigFile types, formatters pattern)"
provides:
  - "claude-ctl memory command with list and --show modes"
  - "User-level CLAUDE.md (~/.claude/CLAUDE.md) scanner path"
  - "formatMemory and formatMemoryContent dispatch functions"
  - "Table and JSON formatters for memory files"
affects: [web-dashboard, advanced-features]

tech-stack:
  added: []
  patterns: [memory-command-registration, memory-formatter-dispatch]

key-files:
  created:
    - src/commands/memory.ts
  modified:
    - src/scanner/paths.ts
    - src/formatters/table.ts
    - src/formatters/json.ts
    - src/formatters/index.ts
    - src/index.ts

key-decisions:
  - "Memory command filters scan results to claude-md type files with exists === true"
  - "--show accepts 1-based index or path substring match for flexible file selection"
  - "Error output goes to stderr with non-zero exit code for --show not found"
  - "formatSize helper provides human-readable file sizes (B, KB, MB)"

patterns-established:
  - "Memory formatter pattern: formatMemoryTable/formatMemoryJson + formatMemoryContentTable/formatMemoryContentJson"
  - "Content preview pattern: --show option with index or substring matching"

duration: 8min
completed: 2026-02-22
---

# Plan 02-02: CLAUDE.md Memory Viewer Summary

**`claude-ctl memory` command with scope-aware CLAUDE.md listing, content preview, and table/JSON formatters**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-22
- **Completed:** 2026-02-22
- **Tasks:** 2
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments
- User-level CLAUDE.md (~/.claude/CLAUDE.md) added to scanner paths for discovery
- `claude-ctl memory` command lists all CLAUDE.md files with scope, path, and size
- `--show` option previews content by 1-based index or path substring match
- Table and JSON formatters for both list and content preview modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Add user-level CLAUDE.md to scanner + create memory command** - `9a07a76` (feat)
2. **Task 2: Create memory formatters (table + JSON)** - `5056dd9` (feat)

## Files Created/Modified
- `src/commands/memory.ts` - Memory command registration with list and --show modes
- `src/scanner/paths.ts` - Added user-level CLAUDE.md to global paths section
- `src/formatters/table.ts` - Added formatMemoryTable and formatMemoryContentTable
- `src/formatters/json.ts` - Added formatMemoryJson and formatMemoryContentJson
- `src/formatters/index.ts` - Added formatMemory and formatMemoryContent dispatch functions
- `src/index.ts` - Registered memoryCommand on Commander program

## Decisions Made
- Memory command filters scan results to show only existing CLAUDE.md files (type === "claude-md" && exists === true)
- --show accepts both 1-based index numbers and path substring matches for flexibility
- Error messages for --show go to stderr with process.exitCode = 1
- File size displayed as human-readable format (B, KB, MB) in table output

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 plan 02 complete
- Memory command follows established command-registration and formatter-dispatch patterns
- Ready to proceed with remaining Phase 2 plans or Phase 3

---
*Phase: 02-config-viewers-settings*
*Completed: 2026-02-22*
