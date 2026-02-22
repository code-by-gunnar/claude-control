---
phase: 01-foundation
plan: 02
subsystem: cli
tags: [commander, chalk, formatters, cli]

requires:
  - phase: 01-foundation/01
    provides: Scanner engine (scan function, types, paths, parser)
provides:
  - CLI entry point with Commander.js (scan and status commands)
  - Output formatters for table and JSON modes
  - Global --json flag for machine-readable output
  - Pipe-friendly output (auto-strips ANSI when not TTY)
affects: [01-foundation/03, 02-settings, 04-web-dashboard]

tech-stack:
  added: []
  patterns: [command-registration-pattern, formatter-dispatch-pattern]

key-files:
  created:
    - src/commands/scan.ts
    - src/commands/status.ts
    - src/formatters/index.ts
    - src/formatters/table.ts
    - src/formatters/json.ts
  modified:
    - src/index.ts

key-decisions:
  - "Formatters implemented before commands since commands import formatters"
  - "Table formatter uses chalk with auto TTY detection — no manual color stripping needed"
  - "Status JSON returns simplified file list (path, scope, type, status) vs full scan JSON"
  - "Credential content stripped in JSON output as defense in depth"
  - "Paths shortened with ~ for home dir in table output, full paths in JSON output"

patterns-established:
  - "Command registration: export function that takes Commander program and registers subcommand"
  - "Formatter dispatch: formatScan/formatStatus(result, json) dispatches to table or json formatter"
  - "Output via process.stdout.write (not console.log) for clean piped output"

duration: 12min
completed: 2026-02-22
---

# Plan 01-02: CLI Framework + Commands Summary

**Commander.js CLI with scan and status commands, table/JSON formatters, and pipe-friendly output**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-02-22T14:10:00Z
- **Completed:** 2026-02-22T14:22:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Working CLI with `claude-ctl scan` and `claude-ctl status` commands
- Table formatter with chalk-colored status icons (green check, red X, yellow warning)
- JSON formatter with clean machine-parseable output
- Global `--json` flag for machine consumption
- Pipe-friendly: ANSI codes auto-stripped when stdout is not a TTY
- Credential content stripped from JSON output as defense in depth

## Task Commits

Each task was committed atomically:

1. **Task 2: Output formatters** - `3dd5197` (feat: implement output formatters for scan and status display)
2. **Task 1: CLI framework + commands** - `692eaf7` (feat: wire up CLI framework with scan and status commands)

_Note: Task 2 was committed before Task 1 because the commands import the formatters._

## Files Created/Modified
- `src/formatters/json.ts` - JSON formatters for scan and status (sanitizes credentials)
- `src/formatters/table.ts` - Human-readable table formatters with chalk colors and path shortening
- `src/formatters/index.ts` - Formatter dispatch (routes to json or table based on --json flag)
- `src/commands/scan.ts` - Scan command registration and handler
- `src/commands/status.ts` - Status command registration and handler
- `src/index.ts` - Updated CLI entry point to register commands and --json global option

## Verification Results

| Check | Result |
|-------|--------|
| `npm run build` succeeds | PASS |
| `npm run typecheck` passes | PASS |
| `claude-ctl scan` lists config files | PASS |
| `claude-ctl status` shows summary | PASS |
| `claude-ctl scan --json` valid JSON | PASS |
| `claude-ctl status --json` valid JSON | PASS |
| `claude-ctl --help` shows commands | PASS |
| No ANSI codes when piped | PASS |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Commit formatters before commands | Commands import formatters; building bottom-up keeps each commit independently valid |
| Use `process.stdout.write` not `console.log` | Cleaner piped output, avoids extra newline behavior differences |
| Simplified status JSON (no content field) | Status is a summary view; full content available via scan --json |
| Strip credentials in JSON even though scanner doesn't read them | Defense in depth; future changes to scanner won't accidentally leak credentials |
| Paths shortened with ~ in table, full paths in JSON | Human readability for table, machine consumption for JSON |

## Deviations from Plan

None - plan executed as written. Task execution order reversed (formatters before commands) for dependency correctness, but all specified artifacts were created.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- CLI is fully functional with scan and status commands
- Ready for plan 01-03 (whatever the next foundation step is)
- Commands accept project-dir argument, defaulting to cwd
- Both human-readable and JSON output modes are working

---
*Phase: 01-foundation*
*Completed: 2026-02-22*
