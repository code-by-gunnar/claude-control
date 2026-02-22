# Roadmap: Claude Control

## Overview

Claude Control goes from zero to a published open-source npm package in 6 phases. We build the scanning engine and CLI first (the foundation everything depends on), then layer on config viewers by type, add the web dashboard, implement differentiating features (health score, comparison, import tracing), and polish for launch. The CLI validates the data layer before the web UI adds presentation complexity.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** — Core scanning engine + CLI framework + file discovery
- [x] **Phase 2: Config Viewers — Settings + CLAUDE.md** — Settings viewer with scope/origin + CLAUDE.md listing/preview
- [x] **Phase 3: Config Viewers — MCP + Hooks + Permissions** — MCP servers, hooks, skills, permissions audit
- [x] **Phase 4: Web Dashboard** — Local React SPA with visual config browsing
- [ ] **Phase 5: Advanced Features** — Health score, cross-project comparison, import tracing
- [ ] **Phase 6: Polish + Launch** — Testing, docs, CI, npm publish

## Phase Details

### Phase 1: Foundation
**Goal**: Working scanning engine and CLI that discovers all config files across global and project directories
**Depends on**: Nothing (first phase)
**Requirements**: SCAN-01, SCAN-02, SCAN-03, SCAN-04, CLI-01, CLI-02, CLI-03, CONF-04
**Success Criteria** (what must be TRUE):
  1. `claude-ctl scan` discovers and lists all config file locations across global and project directories
  2. `claude-ctl status` shows summary of configured vs missing config files
  3. `--json` flag produces valid JSON output on all commands
  4. Tool works correctly on Windows, macOS, and Linux
  5. JSONC files (JSON with comments) are parsed correctly
  6. Missing or inaccessible config files produce clear error messages instead of crashes
**Research**: Unlikely (established CLI + file system patterns, well-covered by project research)
**Plans**: TBD

Plans:
- [x] 01-01: Project scaffolding + core scanning engine (package.json, tsup, TypeScript, scanner, JSONC parser)
- [x] 01-02: CLI framework + commands (Commander.js, scan/status commands, --json output, table/JSON formatters)

### Phase 2: Config Viewers — Settings + CLAUDE.md
**Goal**: Users can inspect settings and CLAUDE.md files with full scope awareness
**Depends on**: Phase 1
**Requirements**: CONF-01, CONF-02, CONF-03, CLMD-01, CLMD-02
**Success Criteria** (what must be TRUE):
  1. `claude-ctl settings` shows all settings values with their source file and scope level
  2. User can see which setting value "wins" when the same setting exists at multiple levels
  3. `claude-ctl memory` lists all CLAUDE.md files with scope and location
  4. User can view the content of any CLAUDE.md file
**Research**: Unlikely (standard parsing + display patterns)
**Plans**: TBD

Plans:
- [x] 02-01: Settings resolver TDD (vitest setup, ScopedSettings/ResolvedSetting types, resolveSettings with scope-priority merge, 9 test cases)
- [x] 02-02: CLAUDE.md viewer (user-level CLAUDE.md discovery, memory command with list/--show modes, table/JSON formatters)
- [x] 02-03: Settings command + formatters (settings command with --key filter, override chain display with box-drawing chars)

### Phase 3: Config Viewers — MCP + Hooks + Permissions
**Goal**: Complete config visibility across all remaining config types
**Depends on**: Phase 2
**Requirements**: MCP-01, MCP-02, MCP-03, HOOK-01, HOOK-02, HOOK-03, PERM-01
**Success Criteria** (what must be TRUE):
  1. `claude-ctl mcp` lists all MCP servers with config details (secrets masked)
  2. Duplicate server names across scopes are flagged
  3. `claude-ctl hooks` shows all configured hooks with event types and matchers
  4. User can see all available hook events and which are configured vs unconfigured
  5. `claude-ctl commands` lists all custom commands and skills with locations
  6. `claude-ctl permissions` shows merged deny > ask > allow with origin tracking
**Research**: Unlikely (same pattern as Phase 2, different config types)
**Plans**: TBD

Plans:
- [x] 03-01: MCP server viewer (config parsing from all sources, details display, secret masking, duplicate detection)
- [x] 03-02: Hooks + skills viewer (hook listing, event catalog, skills/commands listing)
- [x] 03-03: Permissions audit (merged permissions with origin tracking per tool)

### Phase 4: Web Dashboard
**Goal**: Visual dashboard for browsing all config in a browser
**Depends on**: Phase 3
**Requirements**: WEB-01, WEB-02, WEB-03
**Success Criteria** (what must be TRUE):
  1. `claude-ctl dashboard` starts a local web server and opens the browser
  2. Dashboard displays all config areas (settings, CLAUDE.md, MCP, hooks, permissions)
  3. User can drill down into specific configurations via the web UI
**Research**: Likely (UX research needed for dashboard layout and component selection)
**Research topics**: Dashboard layout patterns for config inspectors, shadcn/ui component selection, config tree visualization, responsive design for data-rich views
**Plans**: TBD

Plans:
- [x] 04-01: Web server + REST API (Hono setup, API routes exposing core engine data)
- [x] 04-02: Dashboard UI — layout + navigation (React SPA scaffolding, sidebar nav, overview page)
- [x] 04-03: Dashboard UI — config panels (settings, CLAUDE.md, MCP, hooks, permissions views)
- [x] 04-04: Dashboard polish (SVG icons, responsive design, MCP plugin discovery, drill-down interactions)

### Phase 5: Advanced Features
**Goal**: Differentiating features — gap analysis, comparison, import tracing
**Depends on**: Phase 3 (needs all config types parsed)
**Requirements**: CONF-05, CONF-06, CLMD-03
**Success Criteria** (what must be TRUE):
  1. User can see a health/completeness score for the current project
  2. User can compare configuration across multiple projects side-by-side
  3. User can see @import dependency chains in CLAUDE.md with broken import detection
**Research**: Likely (needs definition of "recommended" Claude Code config for health scoring)
**Research topics**: Community best practices for Claude Code config, recommended config baseline, scoring algorithm design, import chain resolution strategy
**Plans**: TBD

Plans:
- [ ] 05-01: CLAUDE.md import resolver (@import chain parsing, dependency tree, broken import detection)
- [ ] 05-02: Config health score (completeness scoring algorithm, gap detection, recommendations)
- [ ] 05-03: Cross-project comparison (multi-project scanning, side-by-side comparison, diff view)

### Phase 6: Polish + Launch
**Goal**: Production-ready open source release on npm
**Depends on**: Phase 5
**Requirements**: None (quality and launch readiness)
**Success Criteria** (what must be TRUE):
  1. `npm install -g claude-control` works on Windows, macOS, and Linux
  2. `npx claude-control` works for zero-install usage
  3. README and documentation are comprehensive for new users
  4. CI pipeline runs cross-platform tests
**Research**: Unlikely (standard open source launch checklist)
**Plans**: TBD

Plans:
- [ ] 06-01: Cross-platform testing + CI (test matrix, GitHub Actions, Windows/macOS/Linux)
- [ ] 06-02: Documentation + npm publish (README, usage docs, npm package prep, publish)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-02-22 |
| 2. Settings + CLAUDE.md | 3/3 | Complete | 2026-02-22 |
| 3. MCP + Hooks + Permissions | 3/3 | Complete | 2026-02-22 |
| 4. Web Dashboard | 4/4 | Complete | 2026-02-22 |
| 5. Advanced Features | 0/3 | Not started | — |
| 6. Polish + Launch | 0/2 | Not started | — |
