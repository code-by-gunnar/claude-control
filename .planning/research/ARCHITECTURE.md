# Claude Control -- Architecture Research

> Research date: 2026-02-22
> Scope: Dual-interface developer tool (CLI + web dashboard) architecture
> Domain: Configuration inspector/dashboard for Claude Code

---

## 1. System Overview

```
                         +---------------------+
                         |    npm install -g    |
                         |   claude-control     |
                         +----------+----------+
                                    |
                    +---------------+---------------+
                    |                               |
            +-------+-------+             +---------+---------+
            |  CLI Interface |             |  Web Dashboard    |
            |  (claude-ctl)  |             |  (localhost:PORT) |
            +-------+-------+             +---------+---------+
                    |                               |
                    |   Commander / yargs            |   Express + static
                    |   chalk, ora, table            |   Pre-built SPA
                    |                               |
            +-------+-------------------------------+---------+
            |                                                 |
            |              Shared Core Engine                  |
            |                                                 |
            |  +------------+  +------------+  +------------+ |
            |  |  Scanner   |  |   Parser   |  |  Resolver  | |
            |  |  (discover |  |  (read &   |  |  (override | |
            |  |   files)   |  |   parse)   |  |   chains)  | |
            |  +------+-----+  +------+-----+  +------+-----+ |
            |         |               |               |        |
            |  +------+---------------+---------------+------+ |
            |  |           Config Registry                   | |
            |  |  (unified data model for all config types)  | |
            |  +---------------------------------------------+ |
            +-------------------------------------------------+
                    |
            +-------+-------+
            |  File System  |
            |  (node:fs,    |
            |   fast-glob,  |
            |   pathe)      |
            +---------------+

  Data Flow (CLI):
  User runs `claude-ctl scan` --> Core.scan() --> Scanner discovers files
  --> Parser reads each file --> Resolver computes effective config
  --> CLI Formatter renders table/tree to stdout

  Data Flow (Web):
  User runs `claude-ctl dashboard` --> Express server starts
  --> Serves pre-built SPA from dist/web/
  --> SPA calls REST API (localhost) --> Core.scan()
  --> JSON response --> React renders dashboard
```

---

## 2. Key Architectural Decision: Single Package vs Monorepo

### Recommendation: Single Package (with internal module boundaries)

**Confidence: HIGH**

For a tool installed via `npm install -g claude-control`, a single npm package is
strongly preferred over a monorepo. Here is the rationale:

| Factor | Single Package | Monorepo |
|--------|---------------|----------|
| Installation | `npm install -g claude-control` -- simple | Requires publishing multiple packages, orchestrating versions |
| Global CLI | `bin` field points directly to entry | Must aggregate packages into one distributable |
| Web UI bundling | Pre-build SPA, include in `dist/` | Separate package needs to be bundled into main |
| Maintenance | One version, one changelog | Multiple packages to version and release |
| Build complexity | One tsup/esbuild build step + one Vite build | Turborepo/Nx orchestration overhead |
| User experience | Single install, everything works | Risk of version mismatches between packages |

**Evidence from existing tools:**
- **webpack-bundle-analyzer**: Single npm package ships both CLI (`bin`) and web server
  with pre-built static assets in `public/`. Uses Express to serve them.
  ([Source: GitHub](https://github.com/webpack-contrib/webpack-bundle-analyzer)) -- HIGH confidence
- **Verdaccio**: Uses a monorepo of 50+ packages internally but publishes the main
  `verdaccio` package that aggregates everything for `npm install -g verdaccio`.
  ([Source: DeepWiki](https://deepwiki.com/verdaccio/verdaccio)) -- HIGH confidence
- **Storybook**: Monorepo internally, but recently consolidated into `storybook` single
  package with 30+ entry points via `exports` field in package.json.
  ([Source: npm @storybook/core](https://www.npmjs.com/package/@storybook/core)) -- HIGH confidence

**Internal module boundaries without a monorepo:**
Use TypeScript path aliases and barrel exports to enforce boundaries:
```
src/
  core/          # Shared scanning engine (no CLI or web imports)
  cli/           # CLI-specific code (imports from core/)
  web/           # Web server + API routes (imports from core/)
  web-ui/        # Frontend SPA source (built separately with Vite)
```

The TypeScript `references` feature or eslint-plugin-boundaries can enforce
that `core/` never imports from `cli/` or `web/`.

---

## 3. Component Responsibilities

| Component | Responsibility | Key Dependencies | Notes |
|-----------|---------------|-----------------|-------|
| **CLI Entry** (`bin/claude-ctl.js`) | Parse CLI args, dispatch commands | commander or yargs | Thin wrapper; delegates to core |
| **Web Entry** (`src/web/server.ts`) | Start Express, serve SPA + REST API | express, open | Serves pre-built static files |
| **Scanner** (`src/core/scanner.ts`) | Discover config files across file system | fast-glob, pathe | Extensible via scanner plugins |
| **Parser** (`src/core/parsers/`) | Read and parse config files (JSON, TOML, YAML, etc.) | jsonc-parser, @iarna/toml, yaml | One parser per format |
| **Resolver** (`src/core/resolver.ts`) | Compute effective config with inheritance/overrides | (pure logic) | Understands scope hierarchy |
| **Registry** (`src/core/registry.ts`) | Central store for discovered config data | (pure logic) | Typed data model |
| **Formatters** (`src/cli/formatters/`) | Render config data for terminal | chalk, cli-table3, boxen | Table, tree, JSON, summary views |
| **REST API** (`src/web/api/`) | HTTP endpoints returning JSON | express Router | `/api/scan`, `/api/config/:id` |
| **Web UI** (`src/web-ui/`) | Browser dashboard SPA | React (or Preact) + Vite | Pre-built, shipped in `dist/web/` |

---

## 4. Recommended Project Structure

```
claude-control/
|-- package.json              # Single package; bin + exports + scripts
|-- tsconfig.json             # Base TS config
|-- tsconfig.build.json       # Build-specific TS config
|-- tsup.config.ts            # Bundle CLI + server (Node.js targets)
|-- vite.config.ts            # Bundle web UI (browser target)
|
|-- bin/
|   +-- claude-ctl.js         # #!/usr/bin/env node -- CLI entry point
|
|-- src/
|   |-- core/                 # === SHARED SCANNING ENGINE ===
|   |   |-- index.ts          # Public API barrel export
|   |   |-- scanner.ts        # File discovery (fast-glob)
|   |   |-- resolver.ts       # Config inheritance/override resolution
|   |   |-- registry.ts       # Config type registry (extensibility)
|   |   |-- types.ts          # Shared TypeScript interfaces
|   |   |-- constants.ts      # Known config file patterns
|   |   +-- parsers/
|   |       |-- index.ts      # Parser registry
|   |       |-- json.parser.ts
|   |       |-- toml.parser.ts
|   |       |-- yaml.parser.ts
|   |       +-- dotfile.parser.ts
|   |
|   |-- cli/                  # === CLI PRESENTATION LAYER ===
|   |   |-- index.ts          # CLI setup (commander/yargs)
|   |   |-- commands/
|   |   |   |-- scan.ts       # `claude-ctl scan`
|   |   |   |-- show.ts       # `claude-ctl show <config>`
|   |   |   |-- dashboard.ts  # `claude-ctl dashboard` (starts web)
|   |   |   +-- doctor.ts     # `claude-ctl doctor` (validation)
|   |   +-- formatters/
|   |       |-- table.ts      # Tabular output
|   |       |-- tree.ts       # Tree/hierarchy view
|   |       +-- json.ts       # JSON output
|   |
|   |-- web/                  # === WEB SERVER (Node.js) ===
|   |   |-- server.ts         # Express app setup
|   |   |-- api/
|   |   |   |-- routes.ts     # REST API routes
|   |   |   +-- handlers.ts   # Request handlers (call core)
|   |   +-- start.ts          # Start server + open browser
|   |
|   +-- web-ui/               # === WEB DASHBOARD (Browser SPA) ===
|       |-- index.html        # SPA entry point
|       |-- main.tsx          # React/Preact entry
|       |-- App.tsx
|       |-- components/
|       |   |-- ConfigTable.tsx
|       |   |-- ConfigTree.tsx
|       |   |-- FileViewer.tsx
|       |   +-- ScopeChain.tsx
|       |-- hooks/
|       |   +-- useConfig.ts  # Fetch from REST API
|       +-- styles/
|           +-- global.css
|
|-- dist/                     # === BUILD OUTPUT (gitignored) ===
|   |-- cli/                  # Bundled CLI code
|   |   +-- index.js
|   |-- web/                  # Bundled web server + static SPA
|   |   |-- server.js
|   |   +-- public/           # Pre-built SPA assets
|   |       |-- index.html
|   |       |-- assets/
|   |       +-- ...
|   +-- core/                 # (or inlined into cli/ and web/)
|
|-- test/
|   |-- core/
|   |-- cli/
|   +-- web/
|
+-- .github/
    +-- workflows/
        +-- ci.yml
```

### package.json Key Fields

```jsonc
{
  "name": "claude-control",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "claude-ctl": "./bin/claude-ctl.js"
  },
  "exports": {
    ".": {
      "import": "./dist/core/index.js",
      "types": "./dist/core/index.d.ts"
    }
  },
  "files": [
    "bin/",
    "dist/"
  ],
  "scripts": {
    "build": "npm run build:core && npm run build:cli && npm run build:web-ui && npm run build:web",
    "build:core": "tsup src/core/index.ts --format esm --dts",
    "build:cli": "tsup src/cli/index.ts --format esm",
    "build:web": "tsup src/web/server.ts --format esm",
    "build:web-ui": "vite build src/web-ui --outDir dist/web/public",
    "dev": "tsx src/cli/index.ts",
    "dev:web": "concurrently \"tsx src/web/start.ts\" \"vite dev src/web-ui\""
  }
}
```

**Confidence: HIGH** -- This structure mirrors patterns from webpack-bundle-analyzer,
Verdaccio's published package, and Storybook's consolidated architecture.

---

## 5. Architectural Patterns with Code Examples

### 5.1 Scanner Plugin Registry (Strategy Pattern)

The scanner should be extensible so new config types can be added without modifying
existing code. Use the **Registry + Strategy** pattern.

```typescript
// src/core/types.ts
export interface ConfigFileDescriptor {
  /** Unique identifier, e.g. "claude/settings" */
  id: string;
  /** Absolute path to the discovered file */
  path: string;
  /** Scope: enterprise > machine > user > project > local */
  scope: ConfigScope;
  /** Raw parsed content */
  content: Record<string, unknown>;
  /** Format of the file */
  format: 'json' | 'jsonc' | 'toml' | 'yaml' | 'dotfile' | 'env';
  /** Which scanner plugin found it */
  source: string;
}

export type ConfigScope =
  | 'enterprise'
  | 'machine'
  | 'user'
  | 'project'
  | 'local';

export interface ScannerPlugin {
  /** Unique name of this scanner */
  name: string;
  /** Glob patterns to search for */
  patterns: string[];
  /** Base directories to search in (resolved per-platform) */
  getSearchPaths(): string[];
  /** Parse a discovered file into a ConfigFileDescriptor */
  parse(filePath: string, content: string): ConfigFileDescriptor;
}
```

```typescript
// src/core/registry.ts
export class ScannerRegistry {
  private plugins: Map<string, ScannerPlugin> = new Map();

  register(plugin: ScannerPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Scanner plugin "${plugin.name}" already registered`);
    }
    this.plugins.set(plugin.name, plugin);
  }

  getAll(): ScannerPlugin[] {
    return Array.from(this.plugins.values());
  }

  get(name: string): ScannerPlugin | undefined {
    return this.plugins.get(name);
  }
}
```

```typescript
// src/core/scanner.ts
import fg from 'fast-glob';
import { normalize } from 'pathe';
import { ScannerRegistry } from './registry.js';
import type { ConfigFileDescriptor } from './types.js';

export class Scanner {
  constructor(private registry: ScannerRegistry) {}

  async scan(): Promise<ConfigFileDescriptor[]> {
    const results: ConfigFileDescriptor[] = [];

    for (const plugin of this.registry.getAll()) {
      const searchPaths = plugin.getSearchPaths();

      for (const basePath of searchPaths) {
        const entries = await fg(plugin.patterns, {
          cwd: normalize(basePath),
          absolute: true,
          dot: true,
          onlyFiles: true,
          suppressErrors: true,  // Don't crash on permission errors
        });

        for (const entry of entries) {
          const normalizedPath = normalize(entry);
          try {
            const content = await fs.readFile(normalizedPath, 'utf-8');
            results.push(plugin.parse(normalizedPath, content));
          } catch {
            // Log warning but continue scanning
          }
        }
      }
    }

    return results;
  }
}
```

**Confidence: HIGH** -- Strategy + Registry is a well-established pattern for extensible
scanners. fast-glob is the standard choice (3.4B+ npm downloads).
([Source: fast-glob GitHub](https://github.com/mrmlnc/fast-glob))

---

### 5.2 Config Inheritance / Override Chain Resolution

Claude Code uses a layered config system where settings cascade from enterprise
down to local scope, with local taking highest precedence.

```typescript
// src/core/resolver.ts
import type { ConfigFileDescriptor, ConfigScope } from './types.js';

/** Scope priority: higher index = higher priority (wins in merge) */
const SCOPE_PRIORITY: Record<ConfigScope, number> = {
  enterprise: 0,
  machine: 1,
  user: 2,
  project: 3,
  local: 4,
};

export interface ResolvedConfig {
  /** The effective merged configuration */
  effective: Record<string, unknown>;
  /** Chain showing where each value came from (for debugging) */
  chain: Array<{
    scope: ConfigScope;
    path: string;
    values: Record<string, unknown>;
  }>;
}

export function resolveConfigChain(
  descriptors: ConfigFileDescriptor[]
): ResolvedConfig {
  // Sort by scope priority (lowest first, so higher priority overwrites)
  const sorted = [...descriptors].sort(
    (a, b) => SCOPE_PRIORITY[a.scope] - SCOPE_PRIORITY[b.scope]
  );

  const chain = sorted.map((d) => ({
    scope: d.scope,
    path: d.path,
    values: d.content,
  }));

  // Deep merge in priority order
  const effective = sorted.reduce(
    (merged, descriptor) => deepMerge(merged, descriptor.content),
    {} as Record<string, unknown>
  );

  return { effective, chain };
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        value as Record<string, unknown>
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
```

**Confidence: HIGH** -- This mirrors how ESLint's legacy cascading config worked
(searching up directory tree, merging in priority order) and how cosmiconfig
resolves configs by walking up directories.
([Source: ESLint blog](https://eslint.org/blog/2022/08/new-config-system-part-1/),
[Source: cosmiconfig GitHub](https://github.com/cosmiconfig/cosmiconfig))

---

### 5.3 Serving Pre-Built Web UI from CLI

The key pattern: build the SPA at package publish time, ship the static files
inside the npm package, and serve them with Express at runtime.

```typescript
// src/web/server.ts
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'pathe';
import { Scanner } from '../core/scanner.js';
import { apiRoutes } from './api/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createServer(scanner: Scanner) {
  const app = express();

  // REST API routes (consumed by the SPA)
  app.use('/api', apiRoutes(scanner));

  // Serve pre-built SPA static files
  // In the published package, these live at dist/web/public/
  const staticDir = join(__dirname, 'public');
  app.use(express.static(staticDir));

  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(join(staticDir, 'index.html'));
  });

  return app;
}
```

```typescript
// src/web/start.ts
import open from 'open';
import { createServer } from './server.js';
import { createDefaultScanner } from '../core/index.js';

export async function startDashboard(options: { port?: number } = {}) {
  const port = options.port ?? 4200;
  const scanner = createDefaultScanner();
  const app = createServer(scanner);

  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`Dashboard running at ${url}`);
      open(url);
      resolve();
    });
  });
}
```

```typescript
// src/web/api/routes.ts
import { Router } from 'express';
import type { Scanner } from '../../core/scanner.js';

export function apiRoutes(scanner: Scanner): Router {
  const router = Router();

  router.get('/scan', async (_req, res) => {
    try {
      const results = await scanner.scan();
      res.json({ ok: true, data: results });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  router.get('/config/:id', async (req, res) => {
    try {
      const results = await scanner.scan();
      const config = results.find((c) => c.id === req.params.id);
      if (!config) {
        return res.status(404).json({ ok: false, error: 'Not found' });
      }
      res.json({ ok: true, data: config });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  return router;
}
```

**Confidence: HIGH** -- This is exactly how webpack-bundle-analyzer works: it bundles
a React app into `public/`, then serves it with Express using `express.static()`.
([Source: webpack-bundle-analyzer viewer.js](https://github.com/webpack-contrib/webpack-bundle-analyzer/blob/34b6223bcb25292f85fb271d0a1208b2f4a2d0ec/src/viewer.js))

Also validated against Express.js official documentation for `express.static()`:
([Source: Express.js docs](https://expressjs.com/en/starter/static-files.html))

---

### 5.4 Cross-Platform File Path Handling

Windows uses backslashes (`\`), Unix uses forward slashes (`/`). This is a
critical concern for a cross-platform config scanner.

**Recommendation: Use `pathe` for all path operations.**

```typescript
// Use pathe instead of node:path throughout the project
import { join, normalize, resolve, dirname, basename } from 'pathe';

// pathe always returns forward-slash paths, even on Windows
// Windows APIs accept forward slashes, so this is safe

// Example: resolving a config file path
const configPath = join(homedir(), '.claude', 'settings.json');
// Windows result: "C:/Users/alice/.claude/settings.json" (forward slashes)
// Linux result:   "/home/alice/.claude/settings.json"
```

**Why pathe over node:path:**
- `node:path` returns backslashes on Windows, which causes inconsistencies
  in glob patterns, display output, and comparisons
- `pathe` is a drop-in replacement that always uses forward slashes
- Windows Node.js APIs accept forward slashes natively
- Used by the Nuxt/UnJS ecosystem, well-maintained

([Source: pathe / UnJS ecosystem](https://github.com/unjs/pathe)) -- HIGH confidence
([Source: Cross-platform Node.js guide](https://alan.norbauer.com/articles/cross-platform-nodejs/)) -- HIGH confidence

**Platform-specific directory resolution:**

```typescript
// src/core/constants.ts
import { homedir } from 'node:os';
import { join } from 'pathe';

export function getPlatformPaths() {
  const home = homedir();
  const platform = process.platform;

  return {
    // User-level config locations
    userConfig: platform === 'win32'
      ? join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'claude')
      : join(home, '.claude'),

    // Machine-level config locations (read-only by typical users)
    machineConfig: platform === 'win32'
      ? join(process.env.PROGRAMDATA ?? 'C:/ProgramData', 'claude')
      : platform === 'darwin'
        ? '/Library/Application Support/claude'
        : '/etc/claude',

    // Project-level: current working directory and ancestors
    projectRoot: process.cwd(),
  };
}
```

---

### 5.5 Build Pipeline (Two-Phase Build)

The build has two distinct phases:

**Phase 1: Build Web UI (Browser target)**
```bash
vite build src/web-ui --outDir dist/web/public
```
This produces static HTML/CSS/JS files for the browser dashboard.

**Phase 2: Build Node.js code (Node target)**
```bash
tsup src/cli/index.ts src/web/server.ts --format esm --target node18
```
This bundles the CLI and web server code. The server code references the
pre-built SPA files from Phase 1 using `__dirname`-relative paths.

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    // Node.js targets: CLI + Web Server
    entry: {
      'cli/index': 'src/cli/index.ts',
      'web/server': 'src/web/server.ts',
      'web/start': 'src/web/start.ts',
      'core/index': 'src/core/index.ts',
    },
    format: ['esm'],
    target: 'node18',
    dts: { entry: 'src/core/index.ts' },  // Only core exports types
    clean: true,
    splitting: true,  // Share code between CLI and web entries
    external: ['express'],  // Keep express external (large, has native deps)
  },
]);
```

```typescript
// vite.config.ts (for web UI only)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'src/web-ui',
  build: {
    outDir: '../../dist/web/public',
    emptyOutDir: true,
  },
  plugins: [react()],
});
```

**Confidence: HIGH** -- Two-phase build is standard for tools that ship both Node.js
code and browser UIs. Storybook uses a similar pattern (build UI assets, then
bundle server code that references them).

---

## 6. Data Flow Diagrams

### 6.1 CLI Scan Command

```
User                CLI Layer               Core Engine            File System
 |                      |                        |                      |
 |  claude-ctl scan     |                        |                      |
 |--------------------->|                        |                      |
 |                      |  scanner.scan()        |                      |
 |                      |----------------------->|                      |
 |                      |                        |  fast-glob patterns  |
 |                      |                        |--------------------->|
 |                      |                        |    matched paths     |
 |                      |                        |<---------------------|
 |                      |                        |  fs.readFile each    |
 |                      |                        |--------------------->|
 |                      |                        |    file contents     |
 |                      |                        |<---------------------|
 |                      |                        |                      |
 |                      |                        |  parse + categorize  |
 |                      |                        |  (internal)          |
 |                      |                        |                      |
 |                      |  ConfigFileDescriptor[]|                      |
 |                      |<-----------------------|                      |
 |                      |                        |                      |
 |                      |  resolveConfigChain()  |                      |
 |                      |----------------------->|                      |
 |                      |  ResolvedConfig        |                      |
 |                      |<-----------------------|                      |
 |                      |                        |                      |
 |                      |  format for terminal   |                      |
 |                      |  (table/tree/json)     |                      |
 |                      |                        |                      |
 |  rendered output     |                        |                      |
 |<---------------------|                        |                      |
```

### 6.2 Web Dashboard Flow

```
User                Browser SPA           Web Server            Core Engine
 |                      |                      |                      |
 |  open browser        |                      |                      |
 |--------------------->|                      |                      |
 |                      |  GET /               |                      |
 |                      |--------------------->|                      |
 |                      |  index.html + assets |                      |
 |                      |<---------------------|                      |
 |                      |                      |                      |
 |  SPA renders         |                      |                      |
 |                      |  GET /api/scan       |                      |
 |                      |--------------------->|                      |
 |                      |                      |  scanner.scan()      |
 |                      |                      |--------------------->|
 |                      |                      |  ConfigDescriptor[]  |
 |                      |                      |<---------------------|
 |                      |  JSON response       |                      |
 |                      |<---------------------|                      |
 |                      |                      |                      |
 |  dashboard rendered  |                      |                      |
 |<---------------------|                      |                      |
```

### 6.3 Config Override Chain Visualization

```
  Scope Hierarchy (lowest to highest priority):

  +------------------------------------------+
  | ENTERPRISE  /etc/claude/settings.json    |  Locked by admin
  | (scope: enterprise)                       |  (allowedTools, blockedCommands)
  +------------------------------------------+
                    |
                    v  merged into
  +------------------------------------------+
  | USER  ~/.claude/settings.json            |  User preferences
  | (scope: user)                             |  (theme, editor, model)
  +------------------------------------------+
                    |
                    v  merged into
  +------------------------------------------+
  | PROJECT  ./.claude/settings.json         |  Team-shared settings
  | (scope: project)                          |  (permissions, MCPs)
  +------------------------------------------+
                    |
                    v  merged into
  +------------------------------------------+
  | LOCAL  ./.claude/settings.local.json     |  Personal overrides
  | (scope: local)                            |  (not in git)
  +------------------------------------------+
                    |
                    v
  +------------------------------------------+
  | EFFECTIVE CONFIG                          |  What Claude Code sees
  | (computed by resolver)                    |
  +------------------------------------------+
```

---

## 7. Integration Points

### 7.1 bin Entry Point (CLI)

```javascript
#!/usr/bin/env node
// bin/claude-ctl.js
import('../dist/cli/index.js');
```

This thin wrapper allows the CLI to be invoked as `claude-ctl` after global install.
The actual logic is in the bundled `dist/cli/index.js`.

### 7.2 Programmatic API (for testing / integration)

```typescript
// Exposed via package.json "exports" field
import { Scanner, ScannerRegistry, resolveConfigChain } from 'claude-control';

const registry = new ScannerRegistry();
// Register custom scanners...

const scanner = new Scanner(registry);
const results = await scanner.scan();
const resolved = resolveConfigChain(results);
```

### 7.3 REST API Endpoints (consumed by SPA)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scan` | Run full scan, return all discovered configs |
| GET | `/api/config/:id` | Get details for a specific config file |
| GET | `/api/resolve` | Get the effective (merged) configuration |
| GET | `/api/health` | Server health check |

### 7.4 Opening Browser from CLI

```typescript
// Using the 'open' package (ESM, cross-platform)
import open from 'open';

// Opens default browser to the dashboard URL
await open(`http://localhost:${port}`);
```

([Source: open npm package](https://github.com/sindresorhus/open)) -- HIGH confidence

---

## 8. Anti-Patterns to Avoid

### 8.1 DO NOT: Tight coupling between core and presentation

```typescript
// BAD: Core engine importing CLI-specific packages
import chalk from 'chalk';  // Should NOT be in core/

export function scan() {
  console.log(chalk.green('Scanning...'));  // Presentation in core!
}
```

```typescript
// GOOD: Core returns data, presentation layer formats it
// core/scanner.ts
export function scan(): Promise<ConfigFileDescriptor[]> { /* ... */ }

// cli/commands/scan.ts
import chalk from 'chalk';
import { scan } from '../../core/index.js';

const results = await scan();
console.log(chalk.green(`Found ${results.length} config files`));
```

### 8.2 DO NOT: Use process.platform string comparisons everywhere

```typescript
// BAD: Platform checks scattered throughout codebase
if (process.platform === 'win32') {
  path = path.replace(/\//g, '\\');
}
```

```typescript
// GOOD: Centralize platform logic in one module
// core/constants.ts -- single source of truth for platform-specific paths
import { getPlatformPaths } from '../core/constants.js';
const paths = getPlatformPaths();
```

### 8.3 DO NOT: Run Vite dev server in production/published package

```typescript
// BAD: Shipping vite as a dependency for serving the dashboard
import { createServer as createViteServer } from 'vite';

// GOOD: Pre-build SPA at publish time, serve static files
app.use(express.static(join(__dirname, 'public')));
```

The Vite dev server should only be used during development. The published
npm package should contain pre-built static assets.

### 8.4 DO NOT: Use sync file operations in the scanning engine

```typescript
// BAD: Blocks the event loop during large scans
const content = fs.readFileSync(filePath, 'utf-8');  // synchronous

// GOOD: Use async operations to keep the event loop responsive
const content = await fs.readFile(filePath, 'utf-8');  // async
```

Exception: CLI startup code where async adds unnecessary complexity and
the operation is a single small file read.

### 8.5 DO NOT: Monorepo for a single-install tool

```
// BAD: User has to install multiple packages
npm install -g @claude-control/cli @claude-control/core @claude-control/web

// GOOD: Single package, everything included
npm install -g claude-control
```

While monorepos are excellent for large ecosystem tools (Verdaccio, Storybook),
a focused single-purpose tool should ship as a single package for simplicity.

### 8.6 DO NOT: Hardcode config file paths without platform awareness

```typescript
// BAD: Assumes Unix paths
const settingsPath = `${process.env.HOME}/.claude/settings.json`;

// GOOD: Cross-platform with proper fallbacks
import { homedir } from 'node:os';
import { join } from 'pathe';
const settingsPath = join(homedir(), '.claude', 'settings.json');
```

---

## 9. Technology Choices Summary

| Concern | Recommended | Alternatives | Rationale |
|---------|-------------|-------------|-----------|
| CLI framework | Commander.js | yargs, oclif | Lightweight, mature, excellent TS support |
| Web server | Express 4.x | Fastify, Hono | Ubiquitous, battle-tested, simple static serving |
| File scanning | fast-glob | node-glob, fs.glob | Fastest glob implementation, mature |
| Path handling | pathe | node:path, upath, slash | Always forward slashes, UnJS maintained |
| Config parsing | jsonc-parser (JSON), yaml, @iarna/toml | -- | Standard for each format |
| Config discovery | Custom (inspired by cosmiconfig) | cosmiconfig | Need custom scope awareness beyond cosmiconfig |
| Frontend | Preact + Vite | React, Svelte | Small bundle size (3kB vs 40kB for React) |
| Node.js bundler | tsup (esbuild) | rollup, unbuild | Zero-config, fast, tree-shaking |
| Frontend bundler | Vite | webpack, parcel | Fast dev, optimized production builds |
| Terminal styling | chalk 5+ | picocolors, kleur | De facto standard, ESM native |
| Table output | cli-table3 | tty-table, columnify | Handles wide content, box styles |
| Open browser | open | opn (deprecated) | Cross-platform, sindresorhus maintained |
| Testing | Vitest | Jest, node:test | Fast, Vite-native, excellent DX |

---

## 10. Sources and Confidence Levels

### HIGH Confidence (official docs, verified source code, established patterns)

| Source | Used For |
|--------|----------|
| [webpack-bundle-analyzer GitHub](https://github.com/webpack-contrib/webpack-bundle-analyzer) | Single-package CLI+Web pattern, Express static serving |
| [Express.js official docs](https://expressjs.com/en/starter/static-files.html) | express.static() middleware pattern |
| [Verdaccio DeepWiki](https://deepwiki.com/verdaccio/verdaccio) | Monorepo-to-single-package aggregation pattern |
| [Storybook DeepWiki](https://deepwiki.com/storybookjs/storybook) | CLI + Node server + Browser three-layer architecture |
| [fast-glob GitHub](https://github.com/mrmlnc/fast-glob) | File system scanning with glob patterns |
| [cosmiconfig GitHub](https://github.com/cosmiconfig/cosmiconfig) | Config file discovery and directory walking |
| [ESLint config cascade blog](https://eslint.org/blog/2022/08/new-config-system-part-1/) | Config inheritance/override chain architecture |
| [pathe / unjs](https://github.com/unjs/pathe) | Cross-platform path normalization |
| [Node.js path module docs](https://nodejs.org/api/path.html) | POSIX vs Win32 path handling |
| [open npm package](https://github.com/sindresorhus/open) | Cross-platform browser opening |
| [Commander.js GitHub](https://github.com/tj/commander.js) | CLI argument parsing |
| [Turborepo docs](https://turbo.build/repo/docs) | Monorepo vs single-package tradeoffs |
| [npm package.json docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-json/) | bin, exports, files fields |
| [Node.js Events docs](https://nodejs.org/api/events.html) | EventEmitter for async data streaming |

### MEDIUM Confidence (community patterns, multiple corroborating sources)

| Source | Used For |
|--------|----------|
| [Grafana DeepWiki](https://deepwiki.com/grafana/grafana) | Full-stack architecture with plugin system (Go-based, not directly applicable to Node.js) |
| [Storybook DESOSA architecture](https://desosa2022.netlify.app/projects/storybook/posts/storybook-architecture/) | Three-layer (CLI/Server/Browser) architectural breakdown |
| [Cross-platform Node.js guide](https://alan.norbauer.com/articles/cross-platform-nodejs/) | Platform-specific gotchas and solutions |
| [tsup docs](https://tsup.egoist.dev/) | TypeScript bundling for npm packages |
| [esbuild-copy-static-files](https://github.com/nickjj/esbuild-copy-static-files) | Static asset copying in build pipeline |
| [Vite middleware mode docs](https://vite.dev/config/server-options) | Embedding Vite in Express for development |
| [Strategy pattern in TypeScript](https://refactoring.guru/design-patterns/strategy/typescript/example) | Extensible scanner plugin architecture |
| [Registry pattern](https://www.geeksforgeeks.org/system-design/registry-pattern/) | Plugin registration and discovery |

### LOW Confidence (single sources, blog posts, inferred patterns)

| Source | Used For |
|--------|----------|
| [DI in TypeScript](https://khalilstemmler.com/articles/tutorials/dependency-injection-inversion-explained/) | Whether DI containers are needed (likely overkill for this project) |
| [yarn-programmatic npm](https://www.npmjs.com/package/yarn-programmatic) | How yarn exposes programmatic API (limited adoption) |
| [vite-express GitHub](https://github.com/szymmis/vite-express) | Dev-time SPA serving pattern (not for production) |

---

## 11. Open Questions for Implementation

1. **Caching**: Should the scanner cache results between CLI invocations or web API
   requests? For v1 read-only, scanning on every request is likely fine given the
   small number of config files. Consider caching if performance becomes an issue.

2. **File watching**: For the web dashboard, should it watch for config file changes
   and auto-refresh? This could use `chokidar` or Node.js native `fs.watch()`.
   Probably a v2 feature.

3. **SSE vs Polling**: For real-time updates in the web dashboard, Server-Sent Events
   would be simpler than WebSockets. For v1 read-only, simple polling or manual
   refresh is sufficient.

4. **Bundle size budget**: Preact (3kB) vs React (40kB) for the web dashboard.
   Since this is a CLI-bundled tool, smaller is better. Preact with preact/compat
   allows using React-ecosystem components if needed.

5. **Authentication**: Not needed for v1 (localhost only). If remote access is ever
   desired, add a simple token-based auth layer.
