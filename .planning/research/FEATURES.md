# Feature Research: Developer Configuration Management Tools

> Research conducted 2026-02-22 for Claude Control — a unified dashboard and CLI for
> discovering, viewing, and managing Claude Code's scattered configuration.

---

## Table of Contents

1. [Table Stakes Features](#table-stakes-features)
2. [Differentiators](#differentiators)
3. [Anti-Features](#anti-features)
4. [Feature Dependencies Diagram](#feature-dependencies-diagram)
5. [MVP Definition (v1 Launch Features)](#mvp-definition-v1-launch-features)
6. [Feature Prioritization Matrix](#feature-prioritization-matrix)
7. [Competitor Feature Analysis](#competitor-feature-analysis)
8. [Claude Code Configuration Map](#claude-code-configuration-map)
9. [Sources and Confidence Levels](#sources-and-confidence-levels)

---

## Table Stakes Features

These are features users expect from any configuration inspection/dashboard tool.
Without them, the tool feels incomplete.

### 1. Unified Config Listing (Priority: CRITICAL)

**What:** Display all configuration values from all sources in a single view.

**Why it's table stakes:** Every config management tool does this. `git config --list`
shows all values. `npm config list` shows merged config from all levels. `kubectl config view`
shows the merged kubeconfig. Users arriving at Claude Control expect to see everything
in one place — that's the entire reason they'd install it.

**Implementation for Claude Control:**
- Scan and display all settings.json files (user, project, local, managed)
- Show all CLAUDE.md files (global, project, local, parent directories, rules/)
- List all MCP server configurations (.claude.json, .mcp.json, settings files)
- Show all hooks (from all settings.json scopes)
- List all skills/commands (.claude/commands/, .claude/skills/, ~/.claude/commands/)
- List all subagents (.claude/agents/, ~/.claude/agents/)

**Confidence:** HIGH — Every tool in the space does this.

### 2. Show Config Source/Origin (Priority: CRITICAL)

**What:** For each configuration value, show WHERE it came from.

**Why it's table stakes:** `git config --list --show-origin --show-scope` shows both the
file path and scope (system/global/local/worktree) for each setting. VS Code's Settings UI
shows "User", "Workspace", or "Folder" tabs. npm shows which `.npmrc` level a value
comes from. When users see a setting, the first question is always "where did this
come from and why is it this value?"

**Implementation for Claude Control:**
- Tag every config value with its source file path
- Tag with scope level: managed/user/project/local
- Highlight when a value is overridden at a higher-precedence scope

**Confidence:** HIGH — Standard across git, npm, VS Code settings.

### 3. Scope/Level Hierarchy Visualization (Priority: HIGH)

**What:** Show the precedence chain and how values cascade through config levels.

**Why it's table stakes:** VS Code shows User > Workspace > Folder tabs. Git has
system > global > local > worktree. npm has cli > env > project > user > global >
builtin > default. Claude Code's own hierarchy is:
Managed > CLI args > Local > Project > User.
Users need to understand WHY a particular value is active.

**Implementation for Claude Control:**
- Show the full precedence chain for Claude Code:
  1. Managed (highest) — `/Library/Application Support/ClaudeCode/` or `/etc/claude-code/`
  2. Command line arguments
  3. Local (`.claude/settings.local.json`)
  4. Project (`.claude/settings.json`)
  5. User (`~/.claude/settings.json`)
- For each setting, show which levels define it and which one "wins"
- Visual indicator for overridden values (VS Code uses a "Modified" badge)

**Confidence:** HIGH — Core pattern from VS Code, git, npm.

### 4. File Discovery and Existence Checks (Priority: HIGH)

**What:** Show which config files exist and which are missing, including expected
locations that have no file.

**Why it's table stakes:** `chezmoi doctor` checks for expected files.
`npm config list` shows which `.npmrc` files exist. Users want to know not just
what IS configured, but what COULD be configured but isn't. This is the
"find gaps" part of Claude Control's core value proposition.

**Implementation for Claude Control:**
- Check and report on all expected file locations:
  - `~/.claude/settings.json` (exists/missing)
  - `~/.claude/settings.local.json` (exists/missing)
  - `~/.claude/CLAUDE.md` (exists/missing)
  - `~/.claude.json` (exists/missing)
  - `.claude/settings.json` (exists/missing)
  - `.claude/settings.local.json` (exists/missing)
  - `.claude/CLAUDE.md` or `./CLAUDE.md` (exists/missing)
  - `.claude/CLAUDE.local.md` or `./CLAUDE.local.md` (exists/missing)
  - `.mcp.json` (exists/missing)
  - `.claude/commands/` (exists/missing)
  - `.claude/skills/` (exists/missing)
  - `.claude/agents/` (exists/missing)
  - `.claude/rules/` (exists/missing)
  - `.claude/hooks/` (exists/missing)
  - Managed settings paths (platform-specific)
- Report auto-memory directory: `~/.claude/projects/<project>/memory/`

**Confidence:** HIGH — Core value proposition of the tool.

### 5. Read-Only Inspection (Priority: HIGH)

**What:** Allow viewing all configuration without risk of modification.

**Why it's table stakes:** `kubectl config view` is read-only. `git config --list` is
read-only. `npm config list` is read-only. Read-only is the natural starting point
for an inspector tool. Users should feel safe running it.

**Implementation for Claude Control:**
- v1 is explicitly read-only — no writes to any config files
- Clear indication in UI that this is view-only
- No mutation commands in the CLI

**Confidence:** HIGH — Aligned with v1 design decision.

### 6. CLI Interface (Priority: HIGH)

**What:** Command-line access to all inspection features.

**Why it's table stakes:** `kubectl config view`, `git config --list`, `npm config list`,
`chezmoi doctor` — all config tools have CLI first. Developers expect to pipe, grep,
and script against config output.

**Implementation for Claude Control:**
- `claude-ctl status` — overview of all configuration
- `claude-ctl settings` — list all settings with sources
- `claude-ctl mcp` — list MCP servers
- `claude-ctl hooks` — list hooks
- `claude-ctl memory` — list CLAUDE.md files
- `claude-ctl commands` — list custom commands/skills
- Support `--json` output for scripting
- Support `--format` for different output styles

**Confidence:** HIGH — Every tool in the space is CLI-first.

### 7. Machine-Readable Output (Priority: MEDIUM)

**What:** JSON (or similar structured) output for scripting and automation.

**Why it's table stakes:** `kubectl config view -o json`, `npm config list --json`,
`git config --list`. Developers pipe config output into `jq`, other scripts, and CI.

**Implementation for Claude Control:**
- `--json` flag on all CLI commands
- Consistent JSON schema across commands
- Suitable for piping to `jq`

**Confidence:** HIGH — Standard developer tool pattern.

---

## Differentiators

These features go beyond what existing config tools offer and would make Claude Control
uniquely valuable.

### 1. Cross-Project Config Comparison (Priority: HIGH)

**What:** Compare configuration across multiple projects at once. Show which projects
have hooks configured, which have MCP servers, which are missing CLAUDE.md files.

**Why it's differentiating:** No existing tool does this well. `git config` works per-repo.
VS Code settings are per-workspace. kubectl/kubectx works per-cluster but doesn't
compare configs across clusters. Claude Code users who work on multiple projects
(common for consultants, open-source contributors, polyglot developers) have no way
to see their configuration landscape across all projects at once.

**Implementation:**
- Scan multiple `.claude/` directories across the filesystem
- Side-by-side comparison matrix
- "Which projects have X configured?" queries
- Dashboard showing config coverage across projects

**Confidence:** HIGH that this is differentiating. MEDIUM on implementation complexity.

### 2. Config Health/Completeness Score (Priority: MEDIUM)

**What:** A simple score or checklist showing how well-configured a project is.
Think of it like a "Lighthouse score" but for Claude Code configuration.

**Why it's differentiating:** `chezmoi doctor` validates dotfile setup but doesn't
score it. Lighthouse scores web performance. ESLint configs get validated.
No tool currently tells Claude Code users "your project is 60% configured —
you're missing hooks, MCP servers, and custom commands."

**Implementation:**
- Define what a "well-configured" project looks like
- Check for: CLAUDE.md exists, settings.json exists, permissions defined,
  at least one MCP server, hooks for common patterns, gitignore for local files
- Show gaps with actionable suggestions
- Non-judgmental — not "you're doing it wrong," but "here's what you could add"

**Confidence:** MEDIUM — Novel concept, user reception uncertain.

### 3. CLAUDE.md Content Preview and Import Tracing (Priority: HIGH)

**What:** Show the content of all CLAUDE.md files with their `@import` chains
resolved. Show which files import which other files, the load order, and any
circular or broken references.

**Why it's differentiating:** CLAUDE.md supports `@path/to/import` syntax with
recursive imports up to 5 hops deep. This import chain can become opaque.
No existing tool visualizes import trees for Markdown instruction files.
Users frequently ask "what instructions is Claude actually loading?"

**Implementation:**
- Parse CLAUDE.md files for `@` import references
- Build and display the import dependency tree
- Highlight broken imports (referenced file doesn't exist)
- Show the effective "merged" instructions Claude would see
- Flag files exceeding the 200-line auto-memory limit

**Confidence:** HIGH — Directly addresses a known pain point.

### 4. MCP Server Status Dashboard (Priority: MEDIUM)

**What:** Show all configured MCP servers with their configuration details,
scope (user/project/local), and where they're defined.

**Why it's differentiating:** Users configure MCP servers in multiple places
(~/.claude.json, .mcp.json, settings files) and frequently lose track of which
servers are configured where. A known issue is that "MCP servers never start"
because the config is in the wrong file.

**Implementation:**
- List all MCP servers from all config sources
- Show which scope each server belongs to (user/project/local)
- Show command, args, env (with secrets masked)
- Flag duplicate server names across scopes
- For v1 read-only: show config only (no start/stop)

**Confidence:** HIGH — Addresses documented confusion in GitHub issues.

### 5. Permissions Audit View (Priority: MEDIUM)

**What:** Show the effective permissions for the current project after all scope
merging. Display which tools are allowed/denied/ask, and from which config file
each rule originates.

**Why it's differentiating:** Claude Code's permission model uses deny > ask > allow
precedence, and rules merge across managed/user/project/local scopes. This creates
situations where users are surprised by permission behavior. No existing tool
provides a merged permissions view with origin tracking.

**Implementation:**
- Collect all permission rules from all scopes
- Show the effective merged permissions
- For each rule, show which file it came from
- Highlight conflicts and overrides
- Group by tool name (Bash, Read, Edit, Write, WebFetch, etc.)

**Confidence:** HIGH — Directly addresses known user confusion documented in GitHub issues.

### 6. Visual Web Dashboard (Priority: MEDIUM)

**What:** A local web-based dashboard for browsing configuration visually,
complementing the CLI.

**Why it's differentiating:** Lens does this for Kubernetes — providing a visual
IDE on top of kubectl. Lazydocker provides a TUI for Docker. Most developer config
tools are CLI-only. A web dashboard makes config more accessible to beginners and
provides a better overview for power users.

**Implementation:**
- Local web server (no cloud, no auth needed)
- Dashboard view with sections for each config area
- Drill-down into specific configurations
- Responsive design for different screen sizes
- Real-time or refresh-to-update

**Confidence:** MEDIUM — Nice to have but adds significant development complexity.

### 7. Hook Event Catalog (Priority: LOW)

**What:** Show all available hook events (PreToolUse, PostToolUse, SessionStart, etc.)
with documentation, alongside which events the user has hooks configured for.

**Why it's differentiating:** Hooks are a power feature with 17+ event types.
Most users don't know what events are available. Showing "you have hooks for
PreToolUse and PostToolUse, but did you know about Stop, Notification, and
ConfigChange?" helps users discover capabilities.

**Implementation:**
- Catalog of all hook event types with descriptions
- Mark which events have hooks configured
- Show matcher patterns and commands for configured hooks
- Link to documentation for unconfigured events

**Confidence:** LOW — Power user feature, unclear demand.

---

## Anti-Features

Features that are commonly requested but should be avoided or deferred, especially
for a v1 read-only tool.

### 1. Config Editing / Write Operations

**Why it's an anti-feature for v1:** The core value proposition is visibility and
discovery, not editing. Adding write operations introduces risk: wrong file modified,
config corruption, settings lost. VS Code's Settings UI took years to get editing
right. Start read-only, prove the value, then add editing in v2.

**Risk:** Users accidentally modify managed settings, break MCP server configs,
or create invalid JSON. The tool becomes responsible for config backup/restore.

**Recommendation:** Explicitly mark as "v2" and document the decision.

### 2. MCP Server Management (Start/Stop/Restart)

**Why it's an anti-feature for v1:** MCP server lifecycle management belongs to
Claude Code itself. Duplicating it in Claude Control creates confusion about
which tool is authoritative. If Claude Control starts a server that Claude Code
doesn't know about, state gets out of sync.

**Risk:** Orphaned processes, port conflicts, state desynchronization.

**Recommendation:** Show MCP server configuration only. Surface status if
available via Claude Code's own APIs, but don't manage lifecycle.

### 3. Config Synchronization Across Machines

**Why it's an anti-feature for v1:** This is what chezmoi, stow, and yadm do.
It requires solving authentication, conflict resolution, versioning, and
encryption. It's a massive scope expansion that distracts from the core
inspection value.

**Risk:** Scope creep into dotfile manager territory.

**Recommendation:** Focus on inspecting config on the current machine.
Suggest users use existing dotfile managers for sync.

### 4. Secret/Credential Management

**Why it's an anti-feature for v1:** Claude Code stores credentials in
`.credentials.json` and API keys in env vars. Inspecting, displaying, or
managing these creates security risks. Even displaying masked values can
leak information about what credentials exist.

**Risk:** Accidental credential exposure, especially in web dashboard screenshots.

**Recommendation:** Acknowledge credential files exist but don't display
their contents. Show "credentials: configured" vs "credentials: missing" only.

### 5. Real-Time File Watching

**Why it's an anti-feature for v1:** Watching config files for changes adds
complexity (fs watchers, event debouncing, cross-platform differences).
For a read-only inspector, "refresh to update" is sufficient and much simpler.

**Risk:** Performance issues, stale watchers, platform-specific bugs.

**Recommendation:** Manual refresh for CLI, refresh button for web dashboard.
Consider file watching in v2 if users request it.

### 6. Config Validation / Linting

**Why it's an anti-feature for v1:** Validating that config values are correct
(not just present) requires deep knowledge of Claude Code's behavior. If
Claude Control says a config is "valid" but Claude Code rejects it, trust
is broken. Claude Code itself should be the authority on validation.

**Risk:** False positives/negatives, staying in sync with Claude Code's
evolving config schema.

**Recommendation:** Use the JSON schema from schemastore if available for
basic structure validation, but don't validate semantic correctness.
Show raw config and let users decide.

---

## Feature Dependencies Diagram

```
                    +-----------------------+
                    |   Config File Scanner |
                    |  (Core Engine)        |
                    +-----------+-----------+
                                |
                    +-----------+-----------+
                    |                       |
              +-----v-----+         +------v------+
              |  CLI       |         |  Web Server |
              |  Interface |         |  + Frontend |
              +-----+------+         +------+------+
                    |                        |
          +---------+---------+    +---------+---------+
          |         |         |    |         |         |
     +----v--+ +---v---+ +--v--+ +---v---+ +--v---+ +--v-----+
     |Settings| |CLAUDE | |MCP  | |Hooks  | |Skills| |Permis- |
     |Viewer  | |.md    | |Srv  | |Viewer | |/Cmds | |sions   |
     |        | |Viewer | |View | |       | |View  | |Audit   |
     +--------+ +---+---+ +----+ +-------+ +------+ +--------+
                     |
               +-----v------+
               | Import     |
               | Resolver   |
               | (@imports) |
               +-----------+

Dependencies:
  Config File Scanner ── required by ── ALL features
  CLI Interface ── required before ── Web Dashboard (for testing/validation)
  Settings Viewer ── required before ── Permissions Audit (permissions are in settings)
  CLAUDE.md Viewer ── required before ── Import Resolver
  Config File Scanner ── depends on ── File System Access (cross-platform)
  Web Server ── depends on ── Config File Scanner (data source)
  Web Frontend ── depends on ── Web Server (API)
```

### Build Order (Critical Path)

```
Phase 1: Config File Scanner + CLI Interface
    |
Phase 2: Settings Viewer + CLAUDE.md Viewer + MCP Server Viewer
    |
Phase 3: Hooks Viewer + Skills/Commands Viewer + Permissions Audit
    |
Phase 4: Import Resolver + Cross-Project Comparison
    |
Phase 5: Web Server + Web Frontend (Dashboard)
    |
Phase 6: Config Health Score + Hook Event Catalog
```

---

## MVP Definition (v1 Launch Features)

### Must Have (Launch Blockers)

| Feature | Rationale |
|---------|-----------|
| Config file scanner | Core engine, everything depends on it |
| CLI interface (`claude-ctl`) | Primary user interface |
| Settings viewer (all scopes) | Show settings.json from all levels with source/origin |
| CLAUDE.md file listing | Show all memory files with locations |
| MCP server listing | Show all configured MCP servers with scope |
| `--json` output | Machine-readable output for scripting |
| File existence checks | Show which config files exist and which are missing |
| Scope/precedence display | Show which level a setting comes from |

### Should Have (v1.1)

| Feature | Rationale |
|---------|-----------|
| Hooks listing | Show configured hooks from all scopes |
| Skills/commands listing | Show custom slash commands and skills |
| Subagents listing | Show configured agents |
| Permissions audit | Merged permissions view with origins |
| CLAUDE.md content preview | Show file contents, not just paths |
| Cross-platform path handling | Correct paths on macOS, Linux, Windows |

### Nice to Have (v1.2+)

| Feature | Rationale |
|---------|-----------|
| Web dashboard | Visual interface for browsing config |
| CLAUDE.md import resolver | Trace @import chains |
| Cross-project comparison | Compare config across multiple projects |
| Config health score | Completeness scoring |
| Hook event catalog | Discoverability for unconfigured events |
| Rules directory listing | .claude/rules/*.md with path-specific scoping |

---

## Feature Prioritization Matrix

| Feature | User Impact | Dev Effort | Risk | Priority |
|---------|------------|------------|------|----------|
| Config file scanner (core) | CRITICAL | Medium | Low | P0 |
| CLI interface | CRITICAL | Medium | Low | P0 |
| Settings viewer (all scopes) | HIGH | Low | Low | P0 |
| CLAUDE.md file listing | HIGH | Low | Low | P0 |
| MCP server listing | HIGH | Low | Low | P0 |
| File existence checks | HIGH | Low | Low | P0 |
| Scope/precedence display | HIGH | Medium | Low | P0 |
| JSON output (`--json`) | MEDIUM | Low | Low | P0 |
| Hooks listing | MEDIUM | Low | Low | P1 |
| Skills/commands listing | MEDIUM | Low | Low | P1 |
| Permissions audit | HIGH | Medium | Medium | P1 |
| CLAUDE.md content preview | MEDIUM | Low | Low | P1 |
| Subagents listing | LOW | Low | Low | P1 |
| Web dashboard | HIGH | High | Medium | P2 |
| CLAUDE.md import resolver | MEDIUM | Medium | Low | P2 |
| Cross-project comparison | HIGH | High | Medium | P2 |
| Config health score | MEDIUM | Medium | Medium | P3 |
| Hook event catalog | LOW | Low | Low | P3 |
| Config editing (writes) | HIGH | High | High | v2 |
| MCP server management | MEDIUM | High | High | v2 |
| Real-time file watching | LOW | Medium | Medium | v2 |
| Config sync across machines | LOW | Very High | High | Never (out of scope) |

---

## Competitor Feature Analysis

### Configuration Inspection Tools Comparison

| Feature | git config | kubectl config | VS Code Settings | npm config | lazydocker | chezmoi | Claude Control (planned) |
|---------|-----------|---------------|-----------------|-----------|------------|---------|------------------------|
| List all config values | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Show config source/origin | Yes (--show-origin) | Partial | Yes (tabs) | Yes (levels) | Partial | Yes | Yes |
| Show config scope | Yes (--show-scope) | Yes (context) | Yes (User/Workspace/Folder) | Yes | N/A | N/A | Yes |
| Multi-level precedence | 4 levels | Context-based | 3-4 levels | 7 levels | N/A | N/A | 5 levels |
| Visual/GUI interface | No | Lens (separate) | Yes (built-in) | No | TUI | No | Web dashboard |
| CLI interface | Yes | Yes | No | Yes | No (TUI) | Yes | Yes |
| JSON output | Limited | Yes | N/A | Yes | No | Yes | Yes |
| Config editing | Yes | Yes | Yes | Yes | Limited | Yes | No (v1) |
| Cross-project comparison | No | No | No | No | N/A | Partial | Yes (planned) |
| File existence checks | No | No | No | No | No | Yes (doctor) | Yes |
| Health/completeness score | No | No | No | No | No | No | Planned |
| Import/dependency tracing | N/A | N/A | N/A | N/A | N/A | N/A | Yes (CLAUDE.md @imports) |
| Permission visualization | N/A | RBAC viewer (Lens) | N/A | N/A | N/A | N/A | Yes |

### Key Insights from Competitors

**git config:** The gold standard for multi-level config display. `--show-origin` and
`--show-scope` flags were added specifically because users needed to debug config
precedence. Claude Control should replicate this pattern.

**kubectl config / kubectx / Lens:** Demonstrates the CLI-to-GUI progression.
kubectl is CLI, kubectx simplifies context switching, Lens adds visual dashboard.
Claude Control can follow the same path: CLI first, then web dashboard.

**VS Code Settings:** Best example of multi-level config UI. The tabs (User/Workspace/Folder)
with "Modified" indicators and search/filter are the gold standard for config UIs.
The Settings UI also shows default values alongside user overrides.

**npm config:** Shows 7 levels of config precedence, which is the most complex
in this comparison. Claude Code's 5 levels are simpler but still benefit from
clear precedence visualization.

**lazydocker / lazygit:** Demonstrates that even complex tools can be made approachable
with good TUI/UI. The split-pane layout with live updates is effective. Key lesson:
show the most important info at a glance, drill down for details.

**chezmoi:** `chezmoi doctor` is the closest analog to Claude Control's health-check
concept. It validates the dotfile setup and reports issues. The "diff without applying"
feature is analogous to Claude Control's read-only inspection.

### Patterns That Work Well

1. **Show origin with every value** — git's `--show-origin` is universally praised
2. **Tabs or sections for scope levels** — VS Code's approach is intuitive
3. **Doctor/diagnostic commands** — chezmoi doctor, npm doctor, Claude Code's own `claude doctor`
4. **Structured output for scripting** — JSON output is expected by power users
5. **Split view: overview + details** — lazydocker's two-pane layout
6. **Context switching** — kubectx's ability to quickly switch between configs
7. **Default values shown alongside overrides** — VS Code shows what the default is

### Patterns to Avoid

1. **Mixing read and write in the same view** — confusing for inspection tools
2. **Hiding the source of a value** — frustrating when debugging config issues
3. **Requiring authentication for local config viewing** — unnecessary friction
4. **Complex installation** — single command install expected (npm, brew, cargo)

---

## Claude Code Configuration Map

Complete reference of all Claude Code configuration files and directories that
Claude Control needs to scan.

### File Locations

```
GLOBAL (User-level):
  ~/.claude/settings.json              # User settings (shared concept)
  ~/.claude/settings.local.json        # User local overrides
  ~/.claude/CLAUDE.md                  # User memory/instructions
  ~/.claude/commands/                  # Global custom slash commands (*.md)
  ~/.claude/agents/                    # Global subagents (*.md with YAML frontmatter)
  ~/.claude/rules/                     # User-level rules (*.md)
  ~/.claude/projects/<project>/memory/ # Auto-memory per project
    MEMORY.md                          #   Memory entrypoint (first 200 lines loaded)
    <topic>.md                         #   Topic-specific memory files
  ~/.claude.json                       # Preferences, OAuth, MCP servers (user scope)

PROJECT-level:
  .claude/settings.json                # Project settings (committed to git)
  .claude/settings.local.json          # Project local settings (gitignored)
  .claude/CLAUDE.md                    # Project memory (alternative location)
  ./CLAUDE.md                          # Project memory (root level)
  .claude/CLAUDE.local.md              # Local project memory (gitignored)
  ./CLAUDE.local.md                    # Local project memory (root, gitignored)
  .claude/commands/                    # Project custom commands (*.md)
  .claude/skills/                      # Project skills (*/SKILL.md)
  .claude/agents/                      # Project subagents (*.md)
  .claude/rules/                       # Project rules (*.md, supports subdirs)
  .claude/hooks/                       # Hook scripts (*.sh, *.py, etc.)
  .mcp.json                            # Project MCP servers

MANAGED (System-level, requires admin):
  macOS:   /Library/Application Support/ClaudeCode/
    managed-settings.json              # Managed policies
    managed-mcp.json                   # Managed MCP configuration
    CLAUDE.md                          # Organization memory
  Linux:   /etc/claude-code/
    managed-settings.json
    managed-mcp.json
    CLAUDE.md
  Windows: C:\Program Files\ClaudeCode\
    managed-settings.json
    managed-mcp.json
    CLAUDE.md

PARENT DIRECTORY TRAVERSAL:
  Claude Code walks UP from cwd to root, loading CLAUDE.md and CLAUDE.local.md
  at each level. This means monorepo setups can have CLAUDE.md at multiple levels:
    /repo/CLAUDE.md                    # Repo-level instructions
    /repo/packages/frontend/CLAUDE.md  # Package-level instructions
    /repo/packages/backend/CLAUDE.md   # Package-level instructions
```

### Settings.json Key Sections

```
{
  "permissions": {           # Tool access rules (allow/deny/ask)
    "allow": [...],
    "deny": [...],
    "ask": [...],
    "additionalDirectories": [...],
    "defaultMode": "...",
    "disableBypassPermissionsMode": "..."
  },
  "env": {},                 # Environment variables
  "model": "...",            # Default model
  "hooks": {                 # Hook configuration
    "PreToolUse": [...],
    "PostToolUse": [...],
    "SessionStart": [...],
    "Stop": [...],
    "Notification": [...],
    "UserPromptSubmit": [...],
    "PermissionRequest": [...],
    "PostToolUseFailure": [...],
    "SubagentStart": [...],
    "SubagentStop": [...],
    "TeammateIdle": [...],
    "TaskCompleted": [...],
    "ConfigChange": [...],
    "WorktreeCreate": [...],
    "WorktreeRemove": [...],
    "PreCompact": [...],
    "SessionEnd": [...]
  },
  "sandbox": {},             # Sandbox configuration
  "attribution": {},         # Git attribution settings
  "enableAllProjectMcpServers": bool,
  "enabledMcpjsonServers": [...],
  "disabledMcpjsonServers": [...],
  "allowedMcpServers": [...],
  "deniedMcpServers": [...],
  "enabledPlugins": {},      # Plugin activation
  "apiKeyHelper": "...",     # API key generation script
  "autoUpdatesChannel": "..."
}
```

### Hook Event Types (17 total)

| Event | Supports Matchers | Matcher Field |
|-------|-------------------|---------------|
| SessionStart | Yes | How session started (startup/resume/clear/compact) |
| UserPromptSubmit | No | Always fires |
| PreToolUse | Yes | Tool name (Bash, Edit, Write, Read, etc.) |
| PermissionRequest | Yes | Tool name |
| PostToolUse | Yes | Tool name |
| PostToolUseFailure | Yes | Tool name |
| Notification | Yes | Notification type |
| SubagentStart | Yes | Agent type |
| SubagentStop | Yes | Agent type |
| Stop | No | Always fires |
| TeammateIdle | No | Always fires |
| TaskCompleted | No | Always fires |
| ConfigChange | Yes | Config source type |
| WorktreeCreate | No | Always fires |
| WorktreeRemove | No | Always fires |
| PreCompact | Yes | Trigger type (manual/auto) |
| SessionEnd | Yes | End reason |

---

## Sources and Confidence Levels

### HIGH Confidence Sources (Official documentation, verified)

| Source | URL | Used For |
|--------|-----|----------|
| Claude Code Settings Docs | https://code.claude.com/docs/en/settings | Complete settings.json structure, file locations, precedence |
| Claude Code Hooks Guide | https://code.claude.com/docs/en/hooks-guide | Hook event types, configuration format, matchers |
| Claude Code Memory Docs | https://code.claude.com/docs/en/memory | CLAUDE.md hierarchy, @imports, rules directory, auto-memory |
| Claude Code MCP Docs | https://code.claude.com/docs/en/mcp | MCP server configuration locations and format |
| Claude Code Slash Commands Docs | https://code.claude.com/docs/en/slash-commands | Commands/skills directory structure |
| Claude Code Permissions Docs | https://code.claude.com/docs/en/permissions | Permission model (allow/deny/ask), precedence |
| kubectl config view | https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/ | kubectl config feature set |
| VS Code Settings Docs | https://code.visualstudio.com/docs/configure/settings | Multi-level settings UI patterns |
| npm config docs | https://docs.npmjs.com/cli/v8/using-npm/config/ | npm config precedence levels |
| chezmoi comparison | https://www.chezmoi.io/comparison-table/ | Dotfile manager feature comparison |
| chezmoi docs | https://www.chezmoi.io/why-use-chezmoi/ | Dotfile manager features |
| Lens | https://k8slens.dev/ | Kubernetes visual IDE features |
| lazydocker GitHub | https://github.com/jesseduffield/lazydocker | TUI dashboard features |
| lazygit GitHub | https://github.com/jesseduffield/lazygit | TUI config viewer patterns |
| kubectx | https://kubectx.org/ | Context switching patterns |

### MEDIUM Confidence Sources (Third-party guides, verified against official docs)

| Source | URL | Used For |
|--------|-----|----------|
| ClaudeLog Config Guide | https://claudelog.com/configuration/ | Configuration file overview |
| DeepWiki .claude/ folder | https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/4.4-the-.claude-folder-structure | Directory structure details |
| eesel.ai settings.json guide | https://www.eesel.ai/blog/settings-json-claude-code | settings.json structure |
| Inventive HQ Config Files | https://inventivehq.com/knowledge-base/claude/where-configuration-files-are-stored | File location reference |
| yadm docs | https://yadm.io/ | Dotfile manager comparison |
| dotfiles.github.io | https://dotfiles.github.io/utilities/ | Dotfile manager landscape |
| git config article | https://www.theserverside.com/blog/Coffee-Talk-Java-News-Stories-and-Opinions/Use-Git-config-list-to-inspect-gitconfig-variable-settings | git config --show-origin usage |
| Komodor Lens Guide | https://komodor.com/learn/kubernetes-lens/ | Lens feature details |
| alexop.dev Claude Code Customization | https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/ | Skills/subagents structure |
| MCPcat Setup Guide | https://mcpcat.io/guides/adding-an-mcp-server-to-claude-code/ | MCP configuration details |

### LOW Confidence Sources (Community discussion, may be outdated)

| Source | URL | Used For |
|--------|-----|----------|
| HN dotfile discussion | https://news.ycombinator.com/item?id=39975247 | User preferences for dotfile managers |
| BigGo dotfile debate | https://biggo.com/news/202412191324_dotfile-management-tools-comparison | Community tool preferences |
| Claude Code GitHub Issue #1202 | https://github.com/anthropics/claude-code/issues/1202 | Settings.json location confusion |
| Claude Code GitHub Issue #5037 | https://github.com/anthropics/claude-code/issues/5037 | MCP config loading issues |
| claudefa.st settings reference | https://claudefa.st/blog/guide/settings-reference | Settings reference (third-party) |
| korny.info permissions blog | https://blog.korny.info/2025/10/10/better-claude-code-permissions | Permission configuration patterns |

---

## Key Takeaways

1. **The core value proposition is "git config --list --show-origin" for Claude Code.**
   Users want to see everything, know where it came from, and understand precedence.

2. **Claude Code has 20+ configuration file locations across 4+ scope levels.**
   This is more complex than git (4 levels), npm (7 levels but simpler files),
   or VS Code (3-4 levels). The complexity justifies a dedicated inspection tool.

3. **Read-only is the right v1 decision.** Every config tool starts read-only.
   `git config --list` doesn't modify anything. `kubectl config view` is read-only.
   Editing can come later once the data model is proven.

4. **Cross-project comparison is the killer differentiator.** No existing tool
   compares configuration across multiple projects/repos. This is where Claude
   Control can create unique value.

5. **CLAUDE.md import tracing is a unique feature.** The @import system with
   recursive resolution up to 5 hops is specific to Claude Code and creates
   genuine confusion. Visualizing this tree would be immediately valuable.

6. **The web dashboard is important but not for v1 launch.** CLI first, web later.
   This follows the kubectl -> Lens progression that has proven successful.

7. **Avoid scope creep into editing, syncing, or server management.** These are
   separate tools (dotfile managers, Claude Code itself) and adding them dilutes
   the inspection value proposition.
