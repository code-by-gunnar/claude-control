---
milestone: v1
audited: 2026-02-22T22:00:00Z
re_audited: 2026-02-22T23:00:00Z
status: tech_debt
scores:
  requirements: 26/26
  phases: 7/7
  integration: 12/12
  flows: 8/8
gaps: []
resolved_gaps:
  integration:
    - "Dashboard api.ts McpServer.source → McpServer.sourcePath (FIXED in Phase 7)"
    - "Dashboard api.ts McpResult.duplicates sources:string[] → locations:Array<{scope,sourcePath}> (FIXED in Phase 7)"
    - "Dashboard api.ts HookEntry → HookEvent with sourcePath and nested matchers (FIXED in Phase 7)"
    - "Dashboard api.ts CommandEntry source/type fields removed, name-based detection added (FIXED in Phase 7)"
  flows:
    - "MCP page drill-down now shows sourcePath correctly (FIXED in Phase 7)"
    - "Hooks page renders matchers/patterns/commands correctly (FIXED in Phase 7)"
    - "Commands/Skills split uses name.includes(':') detection (FIXED in Phase 7)"
tech_debt:
  - phase: 06-polish-launch
    items:
      - "Placeholder USER in package.json repository URLs and README CI badge needs real GitHub username"
      - "Empty author field in package.json"
  - phase: planning
    items:
      - "Orphan empty directory .planning/phases/03-config-viewers-extended/ should be removed"
  - phase: testing
    items:
      - "No component or integration tests for the React dashboard"
---

# v1 Milestone Audit Report (Re-Audit)

**Milestone:** v1 — Claude Control initial release
**First Audit:** 2026-02-22 — Status: gaps_found (4 integration, 3 flow gaps)
**Re-Audit:** 2026-02-22 — Status: tech_debt (all gaps closed)

## Scores

| Area | First Audit | Re-Audit | Notes |
|------|-------------|----------|-------|
| Requirements | 26/26 | 26/26 | All v1 requirements fully satisfied |
| Phases | 6/6 | 7/7 | Phase 7 (gap closure) added and completed |
| Integration | 8/12 | 12/12 | All 4 dashboard type mismatches fixed |
| E2E Flows | 7/8 | 8/8 | Dashboard MCP/Hooks/Commands drill-down now works |

## Gap Resolution Summary

Phase 7 (Dashboard Type Fixes) was created and executed to close all 4 integration gaps and 3 broken flows identified in the first audit.

| Gap | Status | Fix |
|-----|--------|-----|
| McpServer.source vs sourcePath | FIXED | api.ts uses `sourcePath`, McpPage.tsx updated |
| McpResult.duplicates shape | FIXED | api.ts uses `locations: Array<{scope, sourcePath}>` |
| HookEntry → HookEvent with matchers | FIXED | api.ts renamed to HookEvent with nested matchers structure |
| CommandEntry extra source/type fields | FIXED | api.ts has only `name, path, scope`; name-based detection |
| MCP drill-down empty source | FIXED | Uses `server.sourcePath` throughout |
| Hooks page wrong field names | FIXED | Uses `entry.sourcePath` and `entry.matchers` |
| Commands/Skills empty sections | FIXED | Filters by `name.includes(":")` instead of `type` field |

**Verification:** Phase 7 VERIFICATION.md confirmed 12/12 must-haves passed. Integration checker confirmed 12/12 cross-phase connections and 8/8 E2E flows.

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
| WEB-03: Drill-down support | 4+7 | Satisfied | All pages support drill-down (Phase 7 fixed MCP/Hooks/Commands) |

## Phase Verification Summary

| Phase | Score | Status | Gaps |
|-------|-------|--------|------|
| 1. Foundation | 12/12 | Passed | None (managed scope gap closed inline) |
| 2. Settings + CLAUDE.md | 13/13 | Passed | None |
| 3. MCP + Hooks + Permissions | 22/22 | Passed | None |
| 4. Web Dashboard | 6/6 | Passed | None |
| 5. Advanced Features | All | Passed | None |
| 6. Polish + Launch | All | Passed | Placeholder USER in URLs |
| 7. Dashboard Type Fixes | 12/12 | Passed | None (gap closure phase) |

## Integration Verification

All 12 cross-phase integration points verified correct:

| # | Integration Point | Status |
|---|-------------------|--------|
| 1 | McpServer: server type = dashboard type (sourcePath) | PASS |
| 2 | McpResult.duplicates: server = dashboard (locations) | PASS |
| 3 | HookEvent: server type = dashboard type (matchers) | PASS |
| 4 | CommandEntry: server type = dashboard type (name/path/scope only) | PASS |
| 5 | API routes import extractMcpServers from mcp/resolver | PASS |
| 6 | API routes import extractHooks, extractCommands from hooks/resolver | PASS |
| 7 | API routes import resolvePermissions from permissions/resolver | PASS |
| 8 | API routes import resolveSettings from settings/resolver | PASS |
| 9 | CLI mcp command uses same extractMcpServers | PASS |
| 10 | CLI hooks/commands use same extractHooks, extractCommands | PASS |
| 11 | CLI permissions uses same resolvePermissions | PASS |
| 12 | Build pipeline: tsup then vite (order critical) | PASS |

## E2E Flow Verification

| Flow | Status | Notes |
|------|--------|-------|
| CLI: scan + status | Pass | Discovers files, shows summary |
| CLI: settings with overrides | Pass | Scope merge + override chain display |
| CLI: memory + imports | Pass | Lists CLAUDE.md, shows content, traces imports |
| CLI: mcp + hooks + permissions | Pass | All viewers with --json and filters |
| CLI: health score | Pass | Computes score with categories and recommendations |
| CLI: cross-project compare | Pass | Discovery + parallel comparison |
| Dashboard: overview + navigation | Pass | All 8 pages reachable via sidebar |
| Dashboard: MCP/Hooks/Commands drill-down | Pass | Type mismatches fixed in Phase 7 |

## Build & Test Verification

| Check | Result |
|-------|--------|
| `npm run build` (tsup + Vite) | PASS |
| `npm run typecheck` (tsc --noEmit) | PASS — zero errors |
| Dashboard typecheck | PASS — zero errors |
| `npm test` (vitest) | PASS — 6 files, 77 tests |

## Tech Debt

Non-critical items. No blockers.

### Phase 6 — Publishing
- Placeholder `USER` in `package.json` repository/homepage/bugs URLs and README CI badge needs real GitHub username before npm publish
- Empty `author` field in package.json

### Planning
- Empty orphan directory `.planning/phases/03-config-viewers-extended/` exists with no content (should be removed)

### Testing (Minor)
- No component or integration tests for the React dashboard

---
*First audit: 2026-02-22 — Status: gaps_found*
*Re-audit: 2026-02-22 — Status: tech_debt (all critical gaps resolved)*
