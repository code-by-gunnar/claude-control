---
phase: 12-permission-write-rules
plan: 01
subsystem: permissions
tags: [write, permissions, dashboard, api]
dependency_graph:
  requires: []
  provides: [addPermission-backend, add-permission-endpoint, add-rule-form]
  affects: [permissions-page, writer-module, routes, api-client]
tech_stack:
  added: []
  patterns: [jsonc-parser-modify, form-toggle-panel, triggerRefresh-on-success]
key_files:
  created: []
  modified:
    - src/permissions/writer.ts
    - src/server/routes.ts
    - dashboard/src/lib/api.ts
    - dashboard/src/pages/PermissionsPage.tsx
    - package.json
decisions:
  - "addPermission writes to user-scope only (~/.claude/settings.json), never managed scope"
  - "Uses jsonc-parser modify/applyEdits pattern matching existing removePermission"
  - "Form uses triggerRefresh() from RefreshContext for immediate list update"
metrics:
  duration: "3m"
  completed: "2026-02-23"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 12 Plan 01: Permission Write Rules Summary

Add permission rule write capability with backend addPermission function, POST API endpoint, and dashboard Add Rule form on PermissionsPage.

## One-liner

Permission add capability via jsonc-parser write to user-scope settings.json with toggleable dashboard form and immediate refresh.

## What Was Built

### Task 1: addPermission() backend function and API endpoint

Added `addPermission()` to `src/permissions/writer.ts` alongside existing `removePermission()`:
- Builds permission string from tool name and optional pattern (e.g., `Bash(ls *)`)
- Validates inputs (non-empty tool, valid rule type)
- Reads existing user-scope `~/.claude/settings.json` or starts with `{}`
- Checks for duplicate entries before adding
- Uses jsonc-parser `modify()` + `applyEdits()` to surgically create permissions object, rule array, and append entry
- Creates `~/.claude/` directory if missing via `fs.mkdir(recursive: true)`
- Writes modified JSONC text back preserving comments and formatting

Added `POST /api/permissions/add` endpoint to `src/server/routes.ts`:
- Validates `tool` (required string) and `rule` (must be allow/deny/ask)
- Passes trimmed values to `addPermission()`
- Returns `{ success: true, added: "PermString" }` on success
- Returns structured error with appropriate status codes on failure

Added `addPermission()` fetch function to `dashboard/src/lib/api.ts`:
- POST to `/api/permissions/add` with JSON body
- Returns typed `{ success: boolean; added: string }`
- Extracts error messages from API response on failure

### Task 2: Add Rule form on PermissionsPage

Added a toggleable "Add Rule" form to `dashboard/src/pages/PermissionsPage.tsx`:
- Blue "Add Rule" pill button in page header toggles form visibility
- Three-column form: tool name (required, monospace), pattern (optional, monospace), rule (select dropdown)
- Submit calls `addPermission()` API, triggers `triggerRefresh()` from RefreshContext on success
- Success message (green) auto-dismisses after 3 seconds
- Error message (red) persists until form corrected
- Cancel button closes form and resets all fields
- Info note: "Rules are saved to user-scope settings (~/.claude/settings.json)"
- Styled consistently with existing dashboard patterns (slate borders, blue focus rings, rounded-lg)

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `1d0aa50` | feat(12-01): add addPermission backend function and API endpoint |
| 2 | `aa5c91d` | feat(12-01): add "Add Rule" form to PermissionsPage |

## Verification Results

- [x] `npm run build` succeeds without errors
- [x] `npm test` passes (153 tests, 0 failures)
- [x] POST /api/permissions/add endpoint exists and validates inputs
- [x] addPermission() in writer.ts creates settings.json if missing
- [x] addPermission() appends to existing permissions array via jsonc-parser
- [x] addPermission() rejects duplicate entries
- [x] Dashboard "Add Rule" form visible on permissions page
- [x] Form submits tool + optional pattern + rule to API
- [x] After successful add, permissions list refreshes automatically
- [x] Success/error feedback displayed to user

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **User-scope only writes** -- addPermission targets `~/.claude/settings.json` exclusively, matching the security constraint that managed-scope files are never written to.
2. **jsonc-parser pattern** -- Followed the same `modify()` + `applyEdits()` workflow as `removePermission()` for consistency and JSONC comment preservation.
3. **triggerRefresh for list update** -- Uses the existing RefreshContext pattern rather than manual state manipulation, ensuring the full permissions resolution re-runs server-side.

## Self-Check: PASSED

- All 5 modified/created files exist on disk
- Commit `1d0aa50` found in git log
- Commit `aa5c91d` found in git log
- `npm run build` succeeds (CLI 118.29 KB, dashboard 363.66 KB)
- `npm test` passes (153 tests, 11 suites)
