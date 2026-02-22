# Project Research Summary

**Project:** Claude Control
**Domain:** Developer tool — configuration inspector/dashboard
**Researched:** 2026-02-22
**Confidence:** HIGH

## Executive Summary

Claude Control fills a real gap in the Claude Code ecosystem. Claude Code's configuration is spread across 20+ file locations at 5 scope levels (managed, CLI, local, project, user), with settings.json files, CLAUDE.md memory files with @import chains, MCP server configs in 3+ locations, hooks with 17 event types, skills, commands, subagents, and auto-memory. No existing tool provides a unified view of this complexity. Research validates both the need and the approach.

The recommended architecture is a **single npm package** (not a monorepo) with internal module boundaries: a shared scanning engine (core), CLI presentation layer (commander.js), and web dashboard (Hono server + pre-built React SPA). This pattern is proven by webpack-bundle-analyzer, Verdaccio, and Storybook. The key insight from research is that **the CLI should ship first** — it validates the scanning engine, is useful immediately, and the web dashboard can be added on top of the same core later.

The biggest risks are cross-platform path handling (Windows is a minefield), JSONC parsing (Claude Code uses JSON with comments), and setup friction killing adoption. All are preventable with the right foundation work in Phase 1.

## Key Findings

### Recommended Stack

Summary from STACK.md — a modern, lightweight Node.js stack optimized for developer tools.

**Core technologies:**
- **Node.js 22 LTS** (^22.18.0): Native TypeScript support, LTS until April 2027
- **Commander.js** (^14.0.3): CLI framework — 238M weekly downloads, lightweight subcommands, full TS inference via @commander-js/extra-typings
- **Hono** (^4.12): Web server — 3x faster than Express, 2kb core, built-in static file serving, Web Standards-based
- **React 19 + Vite 7**: Frontend — largest ecosystem for data-rich dashboards (shadcn/ui, TanStack Table, tree views)
- **tsup** (^8.5.1): CLI bundler — zero-config esbuild wrapper for Node.js targets
- **Vitest** (^3.x): Testing — Jest-compatible, native TS/ESM

**Key supporting libraries:**
- **zod** for config schema validation
- **fast-glob** for file system scanning
- **jsonc-parser** for JSON-with-comments parsing (critical — Claude Code uses JSONC)
- **pathe** for cross-platform path normalization
- **shiki** for syntax highlighting in dashboard
- **shadcn/ui + Tailwind CSS v4** for dashboard UI

### Expected Features

Summary from FEATURES.md — feature landscape based on analysis of git config, kubectl, VS Code Settings UI, chezmoi, and other config management tools.

**Must have (table stakes):**
- Unified config listing — all config from all sources in one view
- Config source/origin tagging — where each value comes from
- Scope/level hierarchy visualization — which level "wins"
- File discovery and existence checks — what's configured AND what's missing
- Read-only inspection — safe to run, no mutation risk
- CLI interface with `--json` output for scripting

**Should have (competitive):**
- Cross-project config comparison — no existing tool does this
- Config health/completeness score — "Lighthouse for Claude Code"
- CLAUDE.md import tracing — resolve @import chains
- MCP server status dashboard — which servers configured where
- Permissions audit view — merged deny > ask > allow with origins

**Defer (v2+):**
- Config editing/writes — read-only v1, editing adds risk
- MCP server lifecycle management (start/stop)
- Config sync across machines
- Real-time file watching

### Architecture Approach

Summary from ARCHITECTURE.md — single npm package with three-layer separation.

**Major components:**
1. **Core Engine** (src/core/) — Scanner, Parser, Resolver, Registry. No presentation imports. Extensible via scanner plugins (one per config type)
2. **CLI Layer** (src/cli/) — Commander.js commands that call core and format output for terminal (table, tree, JSON formatters)
3. **Web Layer** (src/web/ + src/web-ui/) — Hono server with REST API serving a pre-built React SPA. `claude-ctl dashboard` starts server and opens browser

**Key architectural decisions:**
- Single package over monorepo — simpler install, one version, proven pattern
- Registry + Strategy pattern for config type extensibility
- Two-phase build: Vite builds SPA → tsup bundles CLI + server
- Internal module boundaries enforced via TypeScript path aliases

### Critical Pitfalls

Top 5 from PITFALLS.md — preventable mistakes specific to this domain.

1. **Cross-platform path handling** — `os.homedir()` has documented bugs on Windows (Unicode usernames, OneDrive redirects). NEVER use string concatenation for paths. Use `path.join()` and validate homedir exists.
2. **Scanning user home directories** — Scan only known specific paths, not recursive walks. Wrap every file read in try/catch. Handle ENOENT, EACCES, EPERM gracefully.
3. **JSONC parsing mismatch** — Claude Code's settings.json uses comments and trailing commas. `JSON.parse()` breaks. Must use jsonc-parser. Also handle UTF-8 BOM bytes.
4. **Port conflicts and server lifecycle** — Implement automatic port detection with fallback. Handle cross-platform signal differences (Windows lacks SIGTERM). Clean shutdown is critical.
5. **Setup friction kills adoption** — 40.6% of early adopters abandon tools with painful setup. Zero-config `npx claude-control` must work. Global npm install has PATH bugs on Windows.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation — Core Scanning Engine + CLI
**Rationale:** Everything depends on the scanning engine. CLI validates it immediately and is useful on its own. Cross-platform correctness must be established here — retrofitting is extremely painful.
**Delivers:** `claude-ctl scan` showing all discovered config files, `claude-ctl status` showing summary
**Addresses:** Config file scanner, CLI interface, file existence checks, cross-platform paths
**Avoids:** Cross-platform path pitfall, JSONC parsing pitfall, home directory scanning pitfall

### Phase 2: Config Viewers — Settings, CLAUDE.md, MCP Servers
**Rationale:** These are the three most-requested config views. Each builds on the scanning engine from Phase 1. Settings viewer must come before permissions (permissions are in settings).
**Delivers:** `claude-ctl settings`, `claude-ctl claude-md`, `claude-ctl mcp` commands with scope/origin display
**Uses:** jsonc-parser, zod schemas, Commander.js subcommands
**Implements:** Parser registry, Resolver (inheritance chains), scope hierarchy visualization

### Phase 3: Extended Config — Hooks, Skills, Permissions
**Rationale:** Second tier of config types. Hooks and skills are less universally used but important for power users. Permissions audit builds on settings viewer.
**Delivers:** `claude-ctl hooks`, `claude-ctl skills`, `claude-ctl permissions` commands
**Addresses:** Hook event catalog, skills/commands listing, permissions audit

### Phase 4: Web Dashboard
**Rationale:** The visual interface is the differentiator for beginners, but requires a solid core engine and API. Building it after the CLI ensures the data layer is battle-tested.
**Delivers:** `claude-ctl dashboard` launching a local web UI with React SPA, REST API
**Uses:** Hono server, React 19, shadcn/ui, Tailwind CSS v4, Vite 7
**Implements:** Web server, REST API routes, dashboard components (ConfigTable, ConfigTree, ScopeChain, FileViewer)

### Phase 5: Advanced Features — Gap Analysis, Health Score, Import Tracing
**Rationale:** Differentiating features that require the full config model to be in place. Gap analysis is the core value differentiator.
**Delivers:** Config health score, CLAUDE.md import resolver, cross-project comparison
**Addresses:** Gap analysis feature, completeness scoring

### Phase 6: Polish + Launch — Testing, Docs, Open Source Prep
**Rationale:** Open source from day one requires good README, docs, CI, and cross-platform testing before the community sees it.
**Delivers:** npm publish, GitHub repo, README, CI pipeline, cross-platform test matrix

### Phase Ordering Rationale

- **CLI before Web UI:** Research unanimously shows that dual-interface tools build the data engine first, CLI second, web third. The CLI validates correctness before the web layer adds complexity.
- **Settings before Permissions:** Permissions live inside settings.json — the viewer must exist first.
- **Core config types (Phase 2) before extended types (Phase 3):** Settings, CLAUDE.md, and MCP servers are universal. Hooks and skills are power-user features.
- **Dashboard (Phase 4) after all config types:** The web UI should show everything, not just a subset. Building it after all viewers ensures complete coverage.
- **Gap analysis last (Phase 5):** Requires the full config model and all parsers to be accurate.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Web Dashboard):** Complex — needs UX research on dashboard layout, component selection, responsive design
- **Phase 5 (Gap Analysis):** Needs research into what "recommended" Claude Code config looks like — community best practices

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented file system and CLI patterns
- **Phase 2 (Config Viewers):** Standard parsing + display
- **Phase 3 (Extended Config):** Same pattern as Phase 2, different config types
- **Phase 6 (Polish):** Standard open source launch checklist

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified with Context7 and npm registry. Commander, Hono, React, Vite all well-documented |
| Features | HIGH | Based on analysis of 6+ comparable tools (git config, kubectl, VS Code, npm, chezmoi, lazydocker) |
| Architecture | HIGH | Single-package pattern verified against webpack-bundle-analyzer, Verdaccio, Storybook source code |
| Pitfalls | HIGH | Based on Node.js bug tracker issues, MCP security advisories, cross-platform community guides |

**Overall confidence:** HIGH

### Gaps to Address

- **Claude Code config schema stability:** Claude Code is evolving rapidly. Config file locations and formats may change. The scanner should be extensible (plugin pattern) to adapt.
- **"Recommended config" baseline:** For gap analysis (Phase 5), we need to define what good config looks like. This requires community research or opinionated defaults.
- **Dashboard UX:** No clear precedent for a Claude Code config dashboard. Phase 4 planning should include UX exploration.

## Sources

### Primary (HIGH confidence)
- Context7: Commander.js, Hono, React, Vite, Vitest official docs
- Node.js documentation (path, fs, os.homedir)
- npm registry (version verification, download stats)
- webpack-bundle-analyzer, Verdaccio, Storybook source code (architecture patterns)
- Claude Code official documentation (config file hierarchy)

### Secondary (MEDIUM confidence)
- Community comparisons of CLI frameworks (Commander vs oclif vs yargs)
- Developer tool architecture blog posts (multiple corroborating sources)
- Cross-platform Node.js guides

### Tertiary (LOW confidence)
- tsup maintenance status (community reports, needs monitoring)
- Specific Claude Code config locations (may change with updates)

---
*Research completed: 2026-02-22*
*Ready for roadmap: yes*
