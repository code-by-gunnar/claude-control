# Milestone v1: Claude Control Initial Release

**Status:** SHIPPED 2026-02-22
**Phases:** 1-7
**Total Plans:** 20

## Overview

Claude Control goes from zero to a published open-source npm package in 7 phases. Built the scanning engine and CLI first (the foundation everything depends on), then layered on config viewers by type, added the web dashboard, implemented differentiating features (health score, comparison, import tracing), polished for launch, and closed integration gaps with a final type-fix phase.

## Phases

### Phase 1: Foundation
**Goal**: Working scanning engine and CLI that discovers all config files across global and project directories
**Depends on**: Nothing (first phase)
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, CLI-01, CLI-02, CLI-03, CONF-04
**Plans**: 2 plans

Plans:
- [x] 01-01: Project scaffolding + core scanning engine (package.json, tsup, TypeScript, scanner, JSONC parser)
- [x] 01-02: CLI framework + commands (Commander.js, scan/status commands, --json output, table/JSON formatters)

### Phase 2: Config Viewers — Settings + CLAUDE.md
**Goal**: Users can inspect settings and CLAUDE.md files with full scope awareness
**Depends on**: Phase 1
**Requirements**: CONF-01, CONF-02, CONF-03, CLMD-01, CLMD-02
**Plans**: 3 plans

Plans:
- [x] 02-01: Settings resolver TDD (vitest setup, ScopedSettings/ResolvedSetting types, resolveSettings with scope-priority merge, 9 test cases)
- [x] 02-02: CLAUDE.md viewer (user-level CLAUDE.md discovery, memory command with list/--show modes, table/JSON formatters)
- [x] 02-03: Settings command + formatters (settings command with --key filter, override chain display with box-drawing chars)

### Phase 3: Config Viewers — MCP + Hooks + Permissions
**Goal**: Complete config visibility across all remaining config types
**Depends on**: Phase 2
**Requirements**: MCP-01, MCP-02, MCP-03, HOOK-01, HOOK-02, HOOK-03, PERM-01
**Plans**: 3 plans

Plans:
- [x] 03-01: MCP server viewer (config parsing from all sources, details display, secret masking, duplicate detection)
- [x] 03-02: Hooks + skills viewer (hook listing, event catalog, skills/commands listing)
- [x] 03-03: Permissions audit (merged permissions with origin tracking per tool)

### Phase 4: Web Dashboard
**Goal**: Visual dashboard for browsing all config in a browser
**Depends on**: Phase 3
**Requirements**: WEB-01, WEB-02, WEB-03
**Plans**: 4 plans

Plans:
- [x] 04-01: Web server + REST API (Hono setup, API routes exposing core engine data)
- [x] 04-02: Dashboard UI — layout + navigation (React SPA scaffolding, sidebar nav, overview page)
- [x] 04-03: Dashboard UI — config panels (settings, CLAUDE.md, MCP, hooks, permissions views)
- [x] 04-04: Dashboard polish (SVG icons, responsive design, MCP plugin discovery, drill-down interactions)

### Phase 5: Advanced Features
**Goal**: Differentiating features — gap analysis, comparison, import tracing
**Depends on**: Phase 3
**Requirements**: CONF-05, CONF-06, CLMD-03
**Plans**: 4 plans

Plans:
- [x] 05-01: CLAUDE.md import resolver (@import chain parsing, dependency tree, broken import detection)
- [x] 05-02: Config health score (completeness scoring algorithm, gap detection, recommendations)
- [x] 05-03: Cross-project comparison (multi-project scanning, side-by-side comparison, diff view)
- [x] 05-04: Dashboard integration (health page, import chain view, projects page)

### Phase 6: Polish + Launch
**Goal**: Production-ready open source release on npm
**Depends on**: Phase 5
**Plans**: 2 plans

Plans:
- [x] 06-01: Cross-platform testing + CI (test matrix, GitHub Actions, Windows/macOS/Linux)
- [x] 06-02: Documentation + npm publish (README, usage docs, npm package prep, publish)

### Phase 7: Dashboard Type Fixes
**Goal**: Fix dashboard type mismatches that cause MCP, Hooks, and Commands pages to render incorrectly
**Depends on**: Phase 6
**Plans**: 1 plan

Plans:
- [x] 07-01: Fix dashboard types and page components (api.ts, McpPage.tsx, HooksPage.tsx)

## Milestone Summary

**Key Decisions:**
- Used `jsonc-parser` (Microsoft's VS Code parser) for JSONC parsing
- Scanner reads files in parallel with `Promise.all`
- Credentials.json content is never read — only existence is reported (security)
- Cross-platform home directory via `os.homedir()` with USERPROFILE/HOME env var fallbacks
- Settings scope priority: managed=0, user=1, project=2, local=3
- Permissions use deny > ask > allow priority merge — deny always wins regardless of scope
- Hono framework for HTTP server — lightweight, TypeScript-native
- Build order: tsup (clean:true wipes dist/) then vite — order critical
- Plugin MCP discovery from ~/.claude/plugins/marketplaces/
- Health category weights: Memory 30%, Settings 25%, MCP 20%, Hooks 15%, Permissions 10%
- CSS-only circular gauge (conic-gradient) for health score display
- Dashboard types must exactly match server-side types
- Command vs skill detection uses name.includes(":")

**Issues Resolved:**
- Managed scope gap (missing platform-specific managed settings path) — closed inline in Phase 1
- 4 dashboard type mismatches causing MCP/Hooks/Commands rendering bugs — closed in Phase 7

**Technical Debt Carried:**
- Placeholder `USER` in package.json repository URLs and README CI badge needs real GitHub username
- Empty `author` field in package.json
- Orphan empty directory `.planning/phases/03-config-viewers-extended/`
- No component or integration tests for the React dashboard

---
*For current project status, see .planning/ROADMAP.md*
