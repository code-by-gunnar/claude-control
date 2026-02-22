# Claude Control

## What This Is

A unified dashboard and CLI tool for discovering, viewing, and managing Claude Code's scattered configuration. Claude Control gives users a single view across all `.claude/` directories (global and project-level), surfacing CLAUDE.md files, MCP servers, hooks, skills, settings, and permissions — along with their inheritance and override hierarchy. Open source, built for everyone from beginners to power users.

## Core Value

Visibility into your complete Claude Code setup — see everything configured across all levels, understand the effective merged state, and discover gaps in your setup without manually hunting through folders.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Scan and discover all Claude Code config files across global (`~/.claude/`) and project-level (`.claude/`) directories
- [ ] Display CLAUDE.md files with global vs project inheritance and effective merged view
- [ ] Show all registered MCP servers — what's connected, which projects use what
- [ ] List hooks and skills — where they live, what triggers them, what's available
- [ ] Display settings.json across all levels with override chain visualization
- [ ] Show permission modes and allowed/denied tool configurations
- [ ] Local web dashboard (browser-based UI) — accessible for beginners, no terminal required
- [ ] `claude-ctl` CLI tool — same discovery engine, terminal-native output for power users and scripting
- [ ] Shared scanning/discovery engine underneath both interfaces
- [ ] Gap analysis — highlight what's available but not configured, suggest improvements

### Out of Scope

- Cloud/remote configuration management — this is a local tool for local config
- Editing or writing config files (v1) — read-only discovery first, editing comes later
- Enterprise/Teams admin features — this is for individual developers
- Claude API integration — this manages local config, not API calls

## Context

- Claude Code stores configuration across multiple locations: `~/.claude/` (global), `.claude/` (project-level), `CLAUDE.md` files (project root + nested), with a specific override/inheritance hierarchy
- Settings live in `settings.json` at global, project, and local levels
- MCP servers, hooks, and skills are configured across these locations with no unified view
- The Claude Code community has noticed this gap — tools like "ccsettings" have appeared as workarounds
- There's significant scattered community knowledge about optimal configuration but no tool to help users discover and apply it
- Target users range from people just starting with Claude Code (need guidance) to power users (need efficiency and scripting)

## Constraints

- **Tech stack**: Node.js / TypeScript — natural fit since most Claude Code users already have Node installed. `npm install -g claude-control` as the install path
- **Local only**: Must run entirely locally. No external services, no data leaving the machine
- **Read-only first**: v1 is read-only discovery. Config editing is a future milestone to avoid accidental breakage
- **Cross-platform**: Must work on Windows (MINGW/WSL), macOS, and Linux — all platforms where Claude Code runs
- **No Claude dependency**: The tool itself should not require Claude API access to function — it's a config inspector, not an AI tool

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dual interface: web UI + CLI | Serves both beginners (browser) and power users (terminal). Same engine underneath | — Pending |
| Node/TypeScript stack | Most Claude Code users have Node. Low install friction. Strong web UI ecosystem | — Pending |
| Open source from day one | Community-driven, fills a gap the community has identified | — Pending |
| Read-only v1 | Discovery and visibility first. Editing adds risk of breaking config | — Pending |
| Local web app (not Electron/VS Code) | Maximum accessibility — just open a browser. No additional installs beyond npm | — Pending |

---
*Last updated: 2026-02-22 after initialization*
