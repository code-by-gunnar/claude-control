# Requirements: Claude Control

**Defined:** 2026-02-22
**Core Value:** Visibility into your complete Claude Code setup — see everything configured across all levels, understand the effective merged state, and discover gaps in your setup without manually hunting through folders.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core Scanning

- [x] **SCAN-01**: Tool discovers all Claude Code config files across global (~/.claude/) and project-level (.claude/) directories
- [x] **SCAN-02**: Tool handles cross-platform paths correctly on Windows, macOS, and Linux
- [x] **SCAN-03**: Tool parses JSONC files (JSON with comments and trailing commas)
- [x] **SCAN-04**: Tool handles missing files, permission denied, and malformed config gracefully with clear error messages

### Settings & Configuration

- [x] **CONF-01**: User can view settings.json values from all scope levels (managed, user, project, local)
- [x] **CONF-02**: Each setting shows its source file path and scope level
- [x] **CONF-03**: User can see which scope level "wins" for each setting with override chain
- [x] **CONF-04**: User can see which expected config files exist and which are missing
- [ ] **CONF-05**: User can see a config health/completeness score for the current project
- [ ] **CONF-06**: User can compare configuration across multiple projects

### CLAUDE.md Files

- [x] **CLMD-01**: User can list all CLAUDE.md files with their scope and file path
- [x] **CLMD-02**: User can preview the content of any CLAUDE.md file
- [ ] **CLMD-03**: User can see @import dependency chains with broken import detection

### MCP Servers

- [x] **MCP-01**: User can list all configured MCP servers from all config sources with scope
- [x] **MCP-02**: User can view server config details (command, args, env with secrets masked)
- [x] **MCP-03**: Tool flags duplicate server names across scopes

### Hooks & Skills

- [x] **HOOK-01**: User can list all configured hooks with event types and matchers
- [x] **HOOK-02**: User can list all custom commands and skills with their locations
- [x] **HOOK-03**: User can see all available hook events with which ones are configured vs unconfigured

### Permissions

- [x] **PERM-01**: User can see merged permissions (deny > ask > allow) with origin tracking per tool

### CLI Interface

- [x] **CLI-01**: Tool provides subcommands: status, settings, mcp, hooks, memory, commands, permissions
- [x] **CLI-02**: All commands support --json output for scripting
- [x] **CLI-03**: Output is pipe-friendly and machine-readable

### Web Dashboard

- [ ] **WEB-01**: User can launch a local web dashboard via `claude-ctl dashboard`
- [ ] **WEB-02**: Dashboard shows all config areas with visual browsing
- [ ] **WEB-03**: Dashboard supports drill-down into specific configurations

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Editing

- **EDIT-01**: User can edit config files through the dashboard
- **EDIT-02**: User can toggle hooks on/off

### MCP Management

- **MCPM-01**: User can start/stop MCP servers
- **MCPM-02**: User can see live MCP server health status

### Advanced

- **ADV-01**: Real-time file watching for config changes
- **ADV-02**: Config validation/linting against Claude Code schema

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Config sync across machines | Scope creep into dotfile manager territory — use chezmoi/stow |
| Secret/credential display | Security risk — show "configured/missing" only |
| MCP server lifecycle management | Belongs to Claude Code itself — avoid state desync |
| Config validation/linting | Claude Code is authority on validity — avoid false positives |
| Cloud/remote features | Local-only tool by design |
| Claude API integration | Config inspector, not AI tool |

## Traceability

Which phases cover which requirements. Updated by create-roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCAN-01 | Phase 1 | Complete |
| SCAN-02 | Phase 1 | Complete |
| SCAN-03 | Phase 1 | Complete |
| SCAN-04 | Phase 1 | Complete |
| CONF-01 | Phase 2 | Complete |
| CONF-02 | Phase 2 | Complete |
| CONF-03 | Phase 2 | Complete |
| CONF-04 | Phase 1 | Complete |
| CONF-05 | Phase 5 | Pending |
| CONF-06 | Phase 5 | Pending |
| CLMD-01 | Phase 2 | Complete |
| CLMD-02 | Phase 2 | Complete |
| CLMD-03 | Phase 5 | Pending |
| MCP-01 | Phase 3 | Complete |
| MCP-02 | Phase 3 | Complete |
| MCP-03 | Phase 3 | Complete |
| HOOK-01 | Phase 3 | Complete |
| HOOK-02 | Phase 3 | Complete |
| HOOK-03 | Phase 3 | Complete |
| PERM-01 | Phase 3 | Complete |
| CLI-01 | Phase 1 | Complete |
| CLI-02 | Phase 1 | Complete |
| CLI-03 | Phase 1 | Complete |
| WEB-01 | Phase 4 | Pending |
| WEB-02 | Phase 4 | Pending |
| WEB-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-22*
*Last updated: 2026-02-22 after roadmap creation*
