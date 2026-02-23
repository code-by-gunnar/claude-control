# Plan 07-01 Summary: Dashboard Type Fixes

## Status: COMPLETE

## What Changed

Fixed 4 type mismatches in `dashboard/src/lib/api.ts` where dashboard interfaces diverged from actual server response shapes, then updated the 2 page components that consumed those types.

## Tasks Completed

### Task 1: Align api.ts types with server response shapes
**Commit:** `feat(07-01): align api.ts types with server response shapes`

Fixed 4 interfaces in `dashboard/src/lib/api.ts`:
1. **McpServer**: Renamed `source: string` to `sourcePath: string` (matches `src/mcp/types.ts`)
2. **McpResult.duplicates**: Changed `sources: string[]` to `locations: Array<{ scope: string; sourcePath: string }>` (matches `McpDuplicate` in `src/mcp/types.ts`)
3. **HookEntry → HookEvent**: Renamed interface, changed `source` to `sourcePath`, replaced flat `hooks` array with nested `matchers: Array<{ matcher?: string; hooks: Array<{ type: string; command: string; async?: boolean }> }>` (matches `HookEvent`/`HookMatcher` in `src/hooks/types.ts`)
4. **CommandEntry**: Removed `source: string` and `type: string` fields — server only has `name`, `path`, `scope` (matches `CommandEntry` in `src/hooks/types.ts`)

### Task 2: Fix McpPage.tsx and HooksPage.tsx to use corrected types
**Commit:** `feat(07-01): fix McpPage and HooksPage to use corrected field names`

**McpPage.tsx:**
- `server.source` → `server.sourcePath` in detail row and React key
- `dup.sources.join(", ")` → `dup.locations.map(loc => scope: sourcePath).join(", ")`

**HooksPage.tsx:**
- Import `HookEvent` instead of `HookEntry`
- `eventEntries` type uses `HookEvent[]`
- `entry.source` → `entry.sourcePath` in key and display
- Flat `entry.hooks` iteration → nested `entry.matchers` with inner `matcher.hooks`
- `command.type` field → derived `command.name.includes(":") ? "skill" : "command"`
- Command/skill section filters: `c.type === "command"` → `!c.name.includes(":")`, `c.type === "skill"` → `c.name.includes(":")`

## Files Modified

| File | Change |
|------|--------|
| `dashboard/src/lib/api.ts` | Fixed 4 interface definitions to match server types |
| `dashboard/src/pages/McpPage.tsx` | Updated 3 field references (source→sourcePath, sources→locations) |
| `dashboard/src/pages/HooksPage.tsx` | Updated type imports, matchers structure, command/skill detection |

## Verification

- `npm run build` succeeds (tsup + Vite, zero errors)
- `npm test` passes (all 45 existing tests green)
- Dashboard types now exactly match server-side type definitions

## Gap Closure

This plan closes the integration gaps identified in the v1 milestone audit:
- WEB-03 (drill-down) is now fully satisfied — MCP and Hooks pages render correct data
- All dashboard type definitions match their server-side counterparts
