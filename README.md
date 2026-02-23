# claude-control

[![CI](https://github.com/code-by-gunnar/claude-control/actions/workflows/ci.yml/badge.svg)](https://github.com/code-by-gunnar/claude-control/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/claude-control)](https://www.npmjs.com/package/claude-control)

CLI + web dashboard for inspecting Claude Code configuration across all scope levels.

![Dashboard Overview](docs/screenshots/overview.png)

## Why

Claude Code is powerful, but its configuration is spread across dozens of files in four scope levels — `settings.json`, `.mcp.json`, `CLAUDE.md`, hooks, permissions, agents, skills, plugins, and more. There's no built-in way to see what's actually active, what's overriding what, or whether your setup is complete.

For newer users, much of Claude Code's advanced functionality (custom agents, skills, hooks, MCP servers, plugin marketplaces) is buried in markdown files and JSON scattered across the file system. Discovering what's available means reading docs, running multiple CLI commands, or manually opening files in `~/.claude/`.

`claude-ctl` puts everything in one place. A single dashboard where you can see all your configuration, explore what each feature does, and understand your setup without digging through directories.

## What It Does

`claude-control` scans Claude Code configuration files across all four scope levels (managed, user, project, local), resolves settings with full override chains, and displays the effective merged state of your setup. It shows MCP servers with automatic secret masking, extracts hooks and permissions, discovers CLAUDE.md memory files with import chains, provides configuration health scoring, and supports cross-project comparison. Everything is available as a terminal CLI or an interactive web dashboard.

## Install

```bash
npm install -g claude-control
```

Then use `claude-ctl` anywhere:

```bash
claude-ctl scan          # Discover all config files
claude-ctl status        # Summary of configured vs missing
claude-ctl dashboard     # Launch web dashboard
```

Or run without installing via `npx claude-control <command>`.

## CLI Commands

| Command | Description |
|---------|-------------|
| `claude-ctl scan` | Discover all config file locations and their existence status |
| `claude-ctl status` | Summary of configured vs missing files across scopes |
| `claude-ctl settings` | View resolved settings with scope and origin tracking |
| `claude-ctl memory` | List CLAUDE.md files and preview their content |
| `claude-ctl mcp` | List MCP servers across all scopes with secret masking |
| `claude-ctl hooks` | View configured hooks and the event catalog |
| `claude-ctl commands` | List custom slash commands and skills |
| `claude-ctl permissions` | Merged permissions audit with deny/ask/allow resolution |
| `claude-ctl agents` | List custom agent definitions from ~/.claude/agents/ |
| `claude-ctl plugins` | List installed plugins with status and MCP servers |
| `claude-ctl marketplaces` | Browse plugin marketplace catalogs |
| `claude-ctl account` | Show subscription type and rate limit tier |
| `claude-ctl health` | Configuration health score with category breakdown |
| `claude-ctl compare` | Cross-project configuration comparison |
| `claude-ctl dashboard` | Launch the interactive web dashboard |

## Common Flags

All commands support these flags:

- `--json` — Output results as machine-readable JSON instead of formatted tables
- `--help` — Show help for any command

Examples:

```bash
# JSON output for scripting
claude-ctl settings --json

# Pipe to jq for filtering
claude-ctl mcp --json | jq '.servers[] | select(.scope == "project")'

# Help for a specific command
claude-ctl health --help
```

## Web Dashboard

The web dashboard provides a visual interface for exploring your Claude Code configuration. Launch it with:

```bash
claude-ctl dashboard
```

This starts a local server and opens your browser at `http://localhost:3737`. Use `--port` to change the port:

```bash
claude-ctl dashboard --port 8080
```

The dashboard includes these pages:

### Settings
Resolved settings table with scope origin tracking and override indicators.

![Settings](docs/screenshots/settings.png)

### Memory
CLAUDE.md files with content preview and import chain visualization.

![Memory](docs/screenshots/memory.png)

### MCP Servers
All configured MCP servers with environment variables and secrets masked.

![MCP Servers](docs/screenshots/mcp-servers.png)

### Plugins
Installed plugin packages with their bundled MCP servers and skills.

![Plugins](docs/screenshots/plugins.png)

### Marketplaces
Plugin repository catalog showing all available plugins across configured marketplaces.

![Marketplaces](docs/screenshots/marketplaces.png)

### Hooks
Hook configurations and the full event catalog.

![Hooks](docs/screenshots/hooks.png)

### Agents
Custom AI agent definitions with tools, model configuration, and usage descriptions.

![Agents](docs/screenshots/agents.png)

### Commands & Skills
Custom slash commands, skills, and plugin-provided capabilities.

![Skills](docs/screenshots/skills.png)

### Permissions
Permission rules with merged deny/ask/allow resolution. Includes inline removal for non-managed entries.

![Permissions](docs/screenshots/permissions.png)

### Health
Visual health score gauge with category breakdown and recommendations.

![Health](docs/screenshots/health.png)

### Projects
Cross-project discovery and side-by-side configuration comparison.

![Projects](docs/screenshots/projects.png)

## Config Scopes

Claude Code uses four configuration scope levels, listed from lowest to highest priority:

| Scope | Priority | Location | Purpose |
|-------|----------|----------|---------|
| **Managed** | 0 (lowest) | System-wide path | Enterprise/organization defaults |
| **User** | 1 | `~/.claude/` | Personal preferences |
| **Project** | 2 | `.claude/` in project root | Project-specific settings |
| **Local** | 3 (highest) | `.claude.local/` in project root | Local overrides (gitignored) |

**Settings merge:** Higher-priority scopes override lower ones. If both user and project define the same setting, the project value wins.

**Permissions merge:** Permissions use a different strategy where `deny` always wins regardless of scope, then `ask` beats `allow`. This ensures security rules cannot be overridden by lower-priority scopes.

## Requirements

- **Node.js 20** or later

## Development

```bash
# Install dependencies
npm install

# Build CLI + dashboard
npm run build

# Run tests
npm test

# Development mode (CLI watch)
npm run dev

# Development mode (dashboard)
npm run dev:dashboard
```

## License

[MIT](LICENSE)
