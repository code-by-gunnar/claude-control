---
milestone: v1
audited: 2026-02-22T21:00:00Z
status: gaps_found
scores:
  requirements: 26/26
  phases: 6/6
  integration: 8/12
  flows: 7/8
gaps:
  integration:
    - "Dashboard api.ts McpServer.source should be McpServer.sourcePath (server sends sourcePath)"
    - "Dashboard api.ts McpResult.duplicates expects sources:string[] but server sends locations:Array<{scope,sourcePath}>"
    - "Dashboard api.ts HookEntry expects source and flat hooks array but server sends sourcePath and nested matchers array"
    - "Dashboard api.ts CommandEntry expects source and type fields that don't exist in server type"
  flows:
    - "MCP page drill-down shows empty source field and duplicate warnings may crash"
    - "Hooks page renders incorrectly — wrong field names for hook details"
    - "Commands/Skills split in Hooks page produces empty sections — no type field on server CommandEntry"
tech_debt:
  - phase: 06-polish-launch
    items:
      - "Placeholder USER in package.json repository URLs and README CI badge needs real GitHub username"
  - phase: planning
    items:
      - "Orphan empty directory .planning/phases/03-config-viewers-extended/ should be removed"
---

# v1 Milestone Audit Report

**Milestone:** v1 — Claude Control initial release
**Audited:** 2026-02-22
**Status:** gaps_found

## Scores

| Area | Score | Notes |
|------|-------|-------|
| Requirements | 26/26 | All v1 requirements functionally satisfied |
| Phases | 6/6 | All phases verified and passed |
| Integration | 8/12 | 4 dashboard type mismatches between api.ts and server types |
| E2E Flows | 7/8 | CLI flows all work; dashboard MCP/Hooks/Commands pages have rendering bugs |

## Requirements Coverage

All 26 v1 requirements are satisfied. Each was verified in its owning phase's VERIFICATION.md.

| Requirement | Phase | Status | Evidence |
|-------------|-------|--------|----------|
| SCAN-01: Discover all config files | 1 | Satisfied | Scanner finds files across global/project dirs |
| SCAN-02: Cross-platform paths | 1 | Satisfied | os.homedir() with USERPROFILE/HOME fallbacks, path.join() |
| SCAN-03: JSONC parsing | 1 | Satisfied | jsonc-parser with allowTrailingComma |
| SCAN-04: Graceful error handling | 1 | Satisfied | Structured error results, no crashes |
| CONF-01: View settings from all scopes | 2 | Satisfied | resolveSettings() with 4-scope merge |
| CONF-02: Show source file and scope | 2 | Satisfied | effectiveScope + effectiveSourcePath tracking |
| CONF-03: Override chain visualization | 2 | Satisfied | Override chain with box-drawing chars in CLI |
| CONF-04: Show existing vs missing files | 1 | Satisfied | scan/status commands show found/missing counts |
| CONF-05: Health/completeness score | 5 | Satisfied | computeHealth() with 5 categories, grades A-F |
| CONF-06: Cross-project comparison | 5 | Satisfied | discoverProjects() + compareProjects() with parallel scanning |
| CLMD-01: List CLAUDE.md files | 2 | Satisfied | memory command lists scope, path, size |
| CLMD-02: Preview CLAUDE.md content | 2 | Satisfied | memory --show displays content |
| CLMD-03: @import chain tracing | 5 | Satisfied | resolveMemoryImports() with 5-level depth, circular detection |
| MCP-01: List MCP servers with scope | 3 | Satisfied | extractMcpServers() from all config sources |
| MCP-02: Server details with secrets masked | 3 | Satisfied | maskHeaderValue() + maskEnvValues() |
| MCP-03: Flag duplicate servers | 3 | Satisfied | Duplicate detection with warning display |
| HOOK-01: List hooks with events/matchers | 3 | Satisfied | extractHooks() with event catalog |
| HOOK-02: List commands/skills | 3 | Satisfied | extractCommands() with scope and path |
| HOOK-03: Show configured vs unconfigured events | 3 | Satisfied | KNOWN_HOOK_EVENTS with status tracking |
| PERM-01: Merged permissions with origin | 3 | Satisfied | deny > ask > allow with scope tracking |
| CLI-01: Subcommands for all areas | 1 | Satisfied | 11 commands registered |
| CLI-02: --json output | 1 | Satisfied | All commands support --json |
| CLI-03: Pipe-friendly output | 1 | Satisfied | No ANSI codes when piped |
| WEB-01: Dashboard launch command | 4 | Satisfied | claude-ctl dashboard starts Hono server |
| WEB-02: All config areas in dashboard | 4 | Satisfied | 8 pages covering all areas |
| WEB-03: Drill-down support | 4 | **Partial** | Works for Settings, Memory, Permissions, Health. MCP/Hooks/Commands pages have type mismatches causing rendering bugs |

## Phase Verification Summary

| Phase | Score | Status | Gaps |
|-------|-------|--------|------|
| 1. Foundation | 12/12 | Passed | None (managed scope gap closed inline) |
| 2. Settings + CLAUDE.md | 13/13 | Passed | None |
| 3. MCP + Hooks + Permissions | 22/22 | Passed | None |
| 4. Web Dashboard | 6/6 | Passed | None noted in phase verification |
| 5. Advanced Features | All | Passed | Dashboard visual spot-check recommended |
| 6. Polish + Launch | All | Passed | Placeholder USER in URLs |

## Integration Issues (Critical)

Four type mismatches between `dashboard/src/lib/api.ts` and the actual server response types. These cause runtime rendering bugs in the dashboard.

### Issue 1: McpServer.source vs sourcePath
- **File:** `dashboard/src/lib/api.ts` line 53
- **Problem:** Dashboard defines `source: string` but server sends `sourcePath: string`
- **Impact:** MCP page expanded view shows empty source field; React keys include `undefined`

### Issue 2: McpResult.duplicates shape
- **File:** `dashboard/src/lib/api.ts` lines 62-64
- **Problem:** Dashboard expects `sources: string[]` but server sends `locations: Array<{scope, sourcePath}>`
- **Impact:** `dup.sources.join(", ")` in McpPage.tsx will fail at runtime

### Issue 3: HookEntry shape mismatch
- **File:** `dashboard/src/lib/api.ts` lines 66-75
- **Problem:** Dashboard expects `source` and flat `hooks` array; server sends `sourcePath` and nested `matchers` array
- **Impact:** Hooks page won't render hook details correctly

### Issue 4: CommandEntry missing fields
- **File:** `dashboard/src/lib/api.ts` lines 84-90
- **Problem:** Dashboard expects `source` and `type` fields that don't exist on server's CommandEntry
- **Impact:** Commands/Skills split in Hooks page produces empty sections (filtering by nonexistent `type`)

### Root Cause
Dashboard types in `api.ts` were authored independently rather than derived from the server-side types. The CLI formatters work correctly because they import types directly from the source modules.

## Tech Debt

### Phase 6
- Placeholder `USER` in `package.json` repository/homepage/bugs URLs and README CI badge needs real GitHub username before npm publish

### Planning
- Empty orphan directory `.planning/phases/03-config-viewers-extended/` exists with no content (should be removed)

## E2E Flow Verification

| Flow | Status | Notes |
|------|--------|-------|
| CLI: scan + status | Pass | Discovers files, shows summary |
| CLI: settings with overrides | Pass | Scope merge + override chain display |
| CLI: memory + imports | Pass | Lists CLAUDE.md, shows content, traces imports |
| CLI: mcp + hooks + permissions | Pass | All viewers with --json and filters |
| CLI: health score | Pass | Computes score with categories and recommendations |
| CLI: cross-project compare | Pass | Discovery + parallel comparison |
| Dashboard: overview + navigation | Pass | All pages reachable via sidebar |
| Dashboard: MCP/Hooks/Commands drill-down | **Fail** | Type mismatches cause incorrect rendering |

## Recommendations

1. **Fix dashboard type mismatches** (4 issues) — align `dashboard/src/lib/api.ts` types with actual server response shapes from `src/mcp/types.ts`, `src/hooks/types.ts`
2. **Update placeholder URLs** — replace `USER` with actual GitHub username in package.json and README
3. **Clean up orphan directory** — remove `.planning/phases/03-config-viewers-extended/`

---
*Audit completed: 2026-02-22*
