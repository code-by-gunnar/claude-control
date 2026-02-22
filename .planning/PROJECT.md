# Claude Control

## What This Is

A CLI tool and local web dashboard for discovering, viewing, and inspecting Claude Code's scattered configuration. Claude Control gives users a single view across all `.claude/` directories (global and project-level), surfacing CLAUDE.md files, MCP servers, hooks, skills, settings, and permissions — along with their inheritance and override hierarchy. Includes health scoring, cross-project comparison, and @import chain tracing. Open source, published on npm as `claude-control`.

## Core Value

Visibility into your complete Claude Code setup — see everything configured across all levels, understand the effective merged state, and discover gaps in your setup without manually hunting through folders.

## Requirements

### Validated

- ✓ Scan and discover all Claude Code config files across global and project directories — v1.0
- ✓ Display CLAUDE.md files with global vs project inheritance — v1.0
- ✓ Show all registered MCP servers with scope and secret masking — v1.0
- ✓ List hooks and skills with triggers, matchers, and locations — v1.0
- ✓ Display settings.json across all levels with override chain visualization — v1.0
- ✓ Show permission modes with deny > ask > allow merge and origin tracking — v1.0
- ✓ Local web dashboard with interactive drill-down — v1.0
- ✓ `claude-ctl` CLI tool with 11 subcommands and --json output — v1.0
- ✓ Shared scanning/discovery engine underneath both interfaces — v1.0
- ✓ Health scoring with gap analysis and recommendations — v1.0
- ✓ Cross-project comparison with workspace discovery — v1.0
- ✓ @import chain tracing with broken import detection — v1.0

### Active

(None — next milestone requirements TBD)

### Out of Scope

- Cloud/remote configuration management — this is a local tool for local config
- Editing or writing config files (v1) — read-only discovery first, editing comes later
- Enterprise/Teams admin features — this is for individual developers
- Claude API integration — this manages local config, not API calls
- Mobile app — web dashboard works in any browser
- Secret/credential display — show "configured/missing" only (security)
- MCP server lifecycle management — belongs to Claude Code itself
- Config validation/linting — Claude Code is authority on validity
- Offline mode — local tool, always has access

## Context

Shipped v1.0 with 9,362 lines of TypeScript/TSX/CSS.
Tech stack: Node.js 18+, TypeScript (strict), Commander.js (CLI), Hono (server), React 19 + Tailwind CSS v4 + Vite 7 (dashboard), Vitest (tests).
77 tests across 6 test files. CI with GitHub Actions (3 OS x 3 Node versions).
Published as `claude-control` on npm with `claude-ctl` binary.

## Constraints

- **Tech stack**: Node.js / TypeScript — `npm install -g claude-control` as install path
- **Local only**: No external services, no data leaving the machine
- **Read-only**: v1 is read-only discovery. Config editing is a future milestone
- **Cross-platform**: Works on Windows, macOS, and Linux
- **No Claude dependency**: Config inspector, not an AI tool

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual interface: web UI + CLI | Serves both beginners (browser) and power users (terminal) | ✓ Good |
| Node/TypeScript stack | Most Claude Code users have Node. Low install friction | ✓ Good |
| Open source from day one | Community-driven, fills a gap the community has identified | ✓ Good |
| Read-only v1 | Discovery and visibility first. Editing adds risk | ✓ Good |
| Local web app (not Electron/VS Code) | Maximum accessibility — just open a browser | ✓ Good |
| jsonc-parser for JSONC | Microsoft's VS Code parser, handles comments and trailing commas | ✓ Good |
| Parallel file scanning with Promise.all | Each file independent, one failure never crashes scan | ✓ Good |
| Hono for HTTP server | Lightweight, TypeScript-native, familiar API | ✓ Good |
| tsup then Vite build order | tsup clean:true wipes dist/, Vite adds dashboard after | ✓ Good — order is critical |
| deny > ask > allow permission merge | Deny always wins regardless of scope, matches Claude Code semantics | ✓ Good |
| Health scoring with 5 weighted categories | Memory 30%, Settings 25%, MCP 20%, Hooks 15%, Permissions 10% | ✓ Good |
| CSS-only score gauge | conic-gradient, no charting library needed | ✓ Good |
| Dashboard types mirror server types exactly | api.ts is the bridge, not independent schema | ✓ Good — Phase 7 fix validated this |
| Command vs skill detection by name format | name.includes(":") distinguishes skills from commands | ✓ Good |

---
*Last updated: 2026-02-22 after v1.0 milestone*
