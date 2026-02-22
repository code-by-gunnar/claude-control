# Claude Control -- Technology Stack Research

> Research date: 2026-02-22
> Methodology: Context7 official documentation + npm registry + web search cross-verification
> Target: Node.js/TypeScript local developer tool with CLI + web dashboard

---

## Core Technologies

| Category | Recommendation | Version | Rationale | Confidence |
|---|---|---|---|---|
| **Runtime** | Node.js 22 LTS | ^22.18.0 | Native TypeScript strip-types support (no flag needed as of v22.18.0). LTS until April 2027. Required by Commander 14, Vitest, Vite 7. | HIGH |
| **Language** | TypeScript | ^5.7 | Industry standard for typed Node.js. Commander extra-typings requires TS 5.0+. Zod infers types from schemas. | HIGH |
| **Package Manager** | pnpm | ^9.0 | Content-addressable store (60-80% disk reduction). Native workspace support. 3-5x faster installs than npm. Industry standard for monorepos in 2025-2026. | HIGH |
| **CLI Framework** | Commander.js | ^14.0.3 | 238M weekly downloads. Lightweight, flexible subcommand support. `@commander-js/extra-typings` for full TS inference. Requires Node >=20. v15 (ESM-only) coming May 2026. | HIGH |
| **Web Server** | Hono + @hono/node-server | ^4.12 / ^1.19 | Ultrafast (3x Express, 40% less memory). Web Standards-based. Built-in `serveStatic` middleware. 2kb core. TypeScript-first. Perfect for lightweight local server. | HIGH |
| **Frontend Framework** | React 19 | ^19.2 | Largest ecosystem for developer tools. shadcn/ui + Radix + TanStack ecosystem. Tree views, tables, JSON viewers all available. 44.7% market share. | HIGH |
| **Frontend Build** | Vite 7 | ^7.3 | Rolldown (Rust) bundler in v7. Library mode for bundling. HMR for dev. Node 20.19+ required. Industry standard frontend build tool. | HIGH |
| **Monorepo Orchestrator** | Turborepo | ^2.5 | Lightweight task runner on top of pnpm workspaces. Automatic caching. Simpler than Nx for small-to-mid monorepos. Used by Vercel ecosystem. | HIGH |
| **CLI Bundler** | tsup | ^8.5.1 | Zero-config TS bundler for CLI packages. Powered by esbuild. Note: no longer actively maintained, but stable and widely used (2272 dependents). Consider migration to tsdown for new projects in late 2026. | MEDIUM |
| **Testing** | Vitest | ^3.x | Jest-compatible API. Powered by Vite/Oxc. Native TS/ESM support. Requires Node >=20. Fast parallel execution. | HIGH |

---

## Supporting Libraries

| Category | Package | Version | Purpose | Confidence |
|---|---|---|---|---|
| **Schema Validation** | zod | ^3.24 | TypeScript-first config schema validation. Zero deps. 2kb gzipped. `.safeParse()` for error-safe validation. Infers TS types from schemas with `z.infer<>`. | HIGH |
| **File Globbing** | fast-glob | ^3.3.3 | Fast file pattern matching. Used internally by many tools. Sync/async/stream APIs. Unix-style patterns. | HIGH |
| **File Globbing (alt)** | tinyglobby | ^0.2 | Ultra-lightweight glob (2 subdeps vs fast-glob's 17). Good for keeping CLI install small. | MEDIUM |
| **File Watching** | chokidar | ^4.0 | Battle-tested (30M repos). Cross-platform fs.watch wrapper. v4 reduced deps from 13 to 1. Note: v4 removed glob support (use fast-glob separately). v5 is ESM-only, requires Node 20+. | HIGH |
| **Terminal Colors** | chalk | ^5.6 | Terminal string styling. No dependencies. ESM-only in v5+. Use v4 if CJS needed. | HIGH |
| **Terminal Spinner** | ora | ^8.x | Elegant terminal spinners. ESM-only. Pairs with chalk. | HIGH |
| **Terminal Tables** | cli-table3 | ^0.6 | Unicode table rendering in terminal. CJS compatible. | HIGH |
| **Syntax Highlighting (web)** | shiki | ^3.22 | VS Code's TextMate engine. Server-side rendering preferred (WASM dep = 250kb). Best quality highlighting. Used by Astro, VitePress. | HIGH |
| **Syntax Highlighting (web alt)** | Prism.js | ^1.29 | 7x faster than Shiki. Lightweight client-side. Good for real-time rendering. | MEDIUM |
| **UI Components** | shadcn/ui | latest | Copy-paste React components built on Radix. Tailwind CSS. Tree views, tables, JSON viewers. Not a dependency -- copied into repo. | HIGH |
| **CSS Framework** | Tailwind CSS | ^4.0 | Utility-first CSS. Zero-runtime in v4 (Rust-based compiler). Perfect for dashboard layouts. | HIGH |
| **Data Tables** | @tanstack/react-table | ^8.x | Headless table logic. Works with shadcn/ui. Sorting, filtering, pagination. | HIGH |
| **Tree View** | @radix-ui/react-accordion | ^1.x | Foundation for file tree / config tree views. Paired with @tanstack/react-virtual for virtualization. | HIGH |
| **Markdown Rendering** | react-markdown | ^9.x | Render CLAUDE.md content in the dashboard. Pairs with remark/rehype plugins. | MEDIUM |
| **YAML Parsing** | yaml | ^2.7 | Parse Claude settings YAML files. TypeScript types included. | HIGH |
| **TOML Parsing** | @iarna/toml | ^2.2 | Parse TOML config files if needed. | LOW |
| **JSON5 Parsing** | json5 | ^2.2 | Parse JSON with comments (common in config files). | MEDIUM |
| **Cross-platform Paths** | pathe | ^2.0 | Cross-platform path utils (normalizes Windows backslashes). ESM-only. | MEDIUM |
| **Cross-platform Paths (alt)** | Node.js `path` + `path.posix` | built-in | Built-in, but requires care on Windows. Use `path.resolve()` and normalize manually. | HIGH |
| **Diff Rendering** | diff | ^7.x | Text diffing for config comparison. | MEDIUM |

---

## Development Tools

| Tool | Version | Purpose | Confidence |
|---|---|---|---|
| **TypeScript** | ^5.7 | Type checking, IDE support, declaration generation | HIGH |
| **Vitest** | ^3.x | Unit and integration testing (Jest-compatible) | HIGH |
| **Playwright** | ^1.50 | E2E testing for web dashboard | MEDIUM |
| **ESLint** | ^9.x | Linting with flat config format | HIGH |
| **Prettier** | ^3.x | Code formatting | HIGH |
| **tsx** | ^4.x | TypeScript execution for development (faster than ts-node). Fallback if native Node TS strip-types has limitations. | MEDIUM |
| **@commander-js/extra-typings** | ^14.x | Full TypeScript inference for Commander options/args | HIGH |
| **changesets** | ^2.27 | Version management and changelogs in monorepo | MEDIUM |
| **lint-staged** | ^15.x | Pre-commit linting on staged files | MEDIUM |
| **husky** | ^9.x | Git hooks for pre-commit checks | MEDIUM |

---

## Monorepo Structure

```
claude-control/
  package.json              # Root: pnpm workspace config, turborepo
  pnpm-workspace.yaml       # Defines workspace packages
  turbo.json                # Turborepo pipeline configuration
  tsconfig.base.json        # Shared TypeScript config

  packages/
    core/                   # @claude-control/core - scanning engine
      package.json          # Shared logic: file discovery, config parsing, schema validation
      src/
        scanner.ts          # File system scanning (fast-glob + chokidar)
        parsers/            # CLAUDE.md, settings.json, MCP config parsers
        schemas/            # Zod schemas for all config types
        types.ts            # Shared TypeScript types

    cli/                    # @claude-control/cli - "claude-ctl" command
      package.json          # Commander.js CLI, depends on @claude-control/core
      src/
        index.ts            # CLI entry point
        commands/            # Subcommand modules

    web/                    # @claude-control/web - dashboard UI
      package.json          # React 19 + Vite 7, depends on @claude-control/core
      src/
        App.tsx
        components/         # shadcn/ui components

    server/                 # @claude-control/server - local API server
      package.json          # Hono server, depends on @claude-control/core
      src/
        index.ts            # Hono app with API routes
        routes/             # API route handlers
```

### Key Configuration Files

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'packages/*'
```

**turbo.json:**
```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

---

## Installation Commands

### Initial Project Setup

```bash
# Create project and initialize
mkdir claude-control && cd claude-control
pnpm init

# Install root dev dependencies
pnpm add -Dw typescript@^5.7 turbo@^2.5 vitest@^3 eslint@^9 prettier@^3

# Create workspace packages
mkdir -p packages/{core,cli,web,server}

# Core engine
cd packages/core
pnpm init
pnpm add zod@^3.24 fast-glob@^3.3 chokidar@^4.0 yaml@^2.7 json5@^2.2
pnpm add -D tsup@^8.5 typescript@^5.7

# CLI
cd ../cli
pnpm init
pnpm add commander@^14.0 chalk@^5.6 ora@^8 cli-table3@^0.6
pnpm add -D @commander-js/extra-typings@^14 tsup@^8.5 typescript@^5.7

# Web dashboard
cd ../web
pnpm init
pnpm add react@^19.2 react-dom@^19.2 shiki@^3.22 react-markdown@^9
pnpm add -D vite@^7.3 @vitejs/plugin-react@^4 tailwindcss@^4 typescript@^5.7

# API server
cd ../server
pnpm init
pnpm add hono@^4.12 @hono/node-server@^1.19
pnpm add -D tsup@^8.5 typescript@^5.7

# Link workspace packages
cd ../..
pnpm install
```

### Running in Development

```bash
# Start all packages in dev mode
pnpm turbo dev

# Run tests across all packages
pnpm turbo test

# Build all packages
pnpm turbo build

# Run CLI in development
pnpm --filter @claude-control/cli dev -- status

# Run web dashboard in development
pnpm --filter @claude-control/web dev
```

---

## Alternatives Considered

### CLI Framework

| Alternative | Why Not | Notes |
|---|---|---|
| **yargs** | More verbose API, heavier (290KB). Callback-heavy syntax less readable in TypeScript. | Good `commandDir()` feature, but Commander's `.command()` chaining is simpler. |
| **oclif** | Too heavy for this use case (enterprise-grade). Steep learning curve. Plugin system overkill for a read-only config inspector. Only 173K weekly downloads vs Commander's 238M. | Consider if tool evolves to need plugin architecture. |
| **citty** (unjs) | Newer, smaller ecosystem. Less documentation. | Interesting lightweight option but unproven at scale. |
| **Stricli** (Bloomberg) | Very TypeScript-focused but small community. | Worth watching for future projects. |

### Web Server

| Alternative | Why Not | Notes |
|---|---|---|
| **Express** | Slower (3x slower than Hono). Aging middleware patterns. Development has slowed. | Still the most documented, but unnecessary weight for local-only tool. |
| **Fastify** | Excellent framework but heavier than needed for local dev tool. Plugin system adds complexity. | Better choice if building a production API service. |
| **http (built-in)** | Too low-level. No routing, no middleware, no static file serving. | Could work but would reinvent Hono's features. |

### Frontend Framework

| Alternative | Why Not | Notes |
|---|---|---|
| **Svelte 5** | Smaller ecosystem for developer tool components. No equivalent to shadcn/ui. 7.2% market share vs React's 44.7%. | Best bundle size (1.6kb vs React's 42kb), but ecosystem gap for this use case. |
| **Vue 3** | Middle ground -- decent ecosystem but fewer developer tool component libraries than React. | Good choice if team prefers Vue. |
| **htmx** | No component model. Hard to build complex tree views, tables, and interactive config viewers. | Great for simpler interfaces but wrong fit for data-rich dashboard. |
| **Preact** | React-compatible but missing some React 19 features. Smaller ecosystem. | Good if bundle size is critical (3kb). |
| **Solid.js** | Fastest benchmarks but smallest ecosystem. Few UI component libraries. | Watch for future growth. |

### Build Tooling

| Alternative | Why Not | Notes |
|---|---|---|
| **tsdown** | Successor to tsup (Rolldown-based, Rust). Requires Node 20.19+. Still maturing but actively developed. | Recommended migration path from tsup. Consider switching mid-2026 when more stable. |
| **esbuild (raw)** | Fast but requires more configuration than tsup. No declaration generation. | tsup wraps esbuild with better defaults. |
| **Rollup** | Slower than esbuild-based tools. More complex config. Being succeeded by Rolldown. | Legacy choice. |
| **Nx** | More powerful than Turborepo but heavier. Better for large enterprise monorepos. | Overkill for 4-package monorepo. |
| **Lerna** | Legacy tool. Essentially deprecated in favor of Nx/Turborepo. | Do not use for new projects. |

---

## What NOT to Use

| Technology | Reason |
|---|---|
| **Express** | Outdated for new projects in 2026. Slower, heavier, development has stagnated. |
| **Webpack** | Slow, complex configuration. Replaced by Vite/esbuild/Rolldown in modern projects. |
| **ts-node** | Slow startup. Use native Node.js TypeScript support or `tsx` instead. |
| **Lerna** | Deprecated monorepo tool. Use pnpm workspaces + Turborepo. |
| **npm/yarn classic** | pnpm is faster, more disk-efficient, and has better workspace support. |
| **Jest** | Slower than Vitest, requires more configuration for TypeScript/ESM. |
| **Angular** | Massive framework, completely wrong fit for a local developer tool dashboard. |
| **Next.js / Nuxt** | Full SSR frameworks. Overkill for a local dashboard. Use Vite + React directly. |
| **Electron** | Heavy (~150MB). This tool runs in the browser, not as a desktop app. |
| **node-glob** | CVE-2025-64756 vulnerability reported. Use fast-glob or tinyglobby instead. |
| **globby** | 23 subdependencies. Use fast-glob (17) or tinyglobby (2) instead. |
| **chalk v4** | CJS-only. Use chalk v5+ (ESM) for modern Node.js projects. |

---

## Version Compatibility Matrix

| Package | Min Node.js | ESM/CJS | Notes |
|---|---|---|---|
| Node.js 22 LTS | -- | -- | Native TS strip-types as of v22.18.0 |
| Commander 14 | 20 | Dual (ESM+CJS) | v15 will be ESM-only (May 2026) |
| Hono 4.x | 18 | ESM | Via @hono/node-server |
| React 19 | -- | ESM | Browser-only (bundled by Vite) |
| Vite 7 | 20.19+ / 22.12+ | ESM | Dropped Node 18 support |
| Vitest 3 | 20 | ESM | Requires Vite >=6 |
| tsup 8.x | 18 | Dual | Not actively maintained; stable |
| chokidar 4 | 14 | Dual | v5 is ESM-only, requires Node 20 |
| chalk 5.x | 12.20 | ESM-only | Use v4 for CJS |
| fast-glob 3.x | 12 | CJS | Stable, actively maintained |
| Zod 3.x | -- | Dual | Works everywhere |
| Shiki 3.x | 18 | ESM | WASM dependency (~250KB) |
| Turborepo 2.x | 18 | -- | CLI tool, not a library |
| pnpm 9 | 18 | -- | Package manager |
| TypeScript 5.7 | -- | -- | Compiler, not runtime |

**Target: Node.js 22 LTS (>=22.18.0)** -- All listed packages are compatible.

---

## Architecture Decision: CLI Bundling Strategy

The CLI package (`claude-ctl`) should bundle the web dashboard as pre-built static assets:

1. **Build pipeline**: `pnpm turbo build` builds `web` first (Vite produces `dist/`), then `server` and `cli` (tsup bundles everything)
2. **Static asset embedding**: The `server` package imports the `web` dist as static files served by Hono's `serveStatic`
3. **CLI launch**: `claude-ctl dashboard` starts the Hono server on a local port and opens the browser
4. **Single npm package**: Published as `claude-control` with all assets bundled

This pattern is used by Storybook, Verdaccio, and similar developer tools that bundle a web UI inside a CLI.

---

## Sources and Confidence Levels

### HIGH Confidence (Official docs, npm registry, Context7 verified)
- [Commander.js GitHub](https://github.com/tj/commander.js) -- v14.0.3, subcommand patterns, TypeScript support
- [Hono Documentation](https://hono.dev/docs/getting-started/nodejs) -- Node.js adapter, static file serving
- [Fastify Documentation](https://github.com/fastify/fastify) -- TypeScript support, plugin architecture
- [React Official](https://react.dev/versions) -- v19.2.4, current stable
- [Vite Releases](https://vite.dev/releases) -- v7.3.1, Rolldown bundler
- [npm: commander](https://www.npmjs.com/package/commander) -- 238M weekly downloads
- [npm: hono](https://www.npmjs.com/package/hono) -- v4.12.1
- [npm: @hono/node-server](https://www.npmjs.com/package/@hono/node-server) -- v1.19.9
- [npm: tsup](https://www.npmjs.com/package/tsup) -- v8.5.1, maintenance mode
- [npm: shiki](https://www.npmjs.com/package/shiki) -- v3.22.0
- [npm: fast-glob](https://www.npmjs.com/package/fast-glob) -- v3.3.3
- [npm: chalk](https://www.npmjs.com/package/chalk) -- v5.6.2
- [npm: chokidar](https://www.npmjs.com/package/chokidar) -- v4.x, v5 ESM-only
- [Node.js TypeScript Natively](https://nodejs.org/en/learn/typescript/run-natively) -- v22.18.0 no-flag TS
- [Zod Official](https://zod.dev/) -- TypeScript-first validation
- [yargs GitHub](https://github.com/yargs/yargs) -- commandDir(), command modules
- [Vitest](https://vitest.dev/guide/) -- v3, requires Node >=20
- [pnpm Workspaces](https://pnpm.io/workspaces) -- official workspace docs
- [Turborepo Docs](https://turborepo.dev/docs) -- v2.x orchestration
- [tsdown](https://tsdown.dev/guide/) -- Rolldown-based successor to tsup
- [Context7: Commander.js](https://github.com/tj/commander.js/blob/master/Readme.md) -- subcommand patterns, TS extra-typings

### MEDIUM Confidence (Cross-verified web sources, community consensus)
- [Hono vs Fastify vs Express Comparison](https://betterstack.com/community/guides/scaling-nodejs/hono-vs-fastify/) -- performance benchmarks
- [CLI Framework Comparison](https://npm-compare.com/commander,oclif,vorpal,yargs) -- download stats, stars
- [React vs Svelte vs Vue 2025](https://merge.rocks/blog/comparing-front-end-frameworks-for-startups-in-2025-svelte-vs-react-vs-vue) -- market share, satisfaction
- [Turborepo vs Nx](https://www.wisp.blog/blog/nx-vs-turborepo-a-comprehensive-guide-to-monorepo-tools) -- feature comparison
- [tsup vs Vite/Rollup](https://dropanote.de/en/blog/20250914-tsup-vs-vite-rollup-when-simple-beats-complex/) -- library bundling comparison
- [Syntax Highlighter Comparison](https://chsm.dev/blog/2025/01/08/comparing-web-code-highlighters) -- Shiki vs Prism benchmarks
- [Best TypeScript Backend Frameworks 2026](https://encore.dev/articles/best-typescript-backend-frameworks) -- framework landscape
- [Complete Monorepo Guide pnpm + Workspaces 2025](https://jsdev.space/complete-monorepo-guide/) -- pnpm workspace patterns
- [shadcn/ui](https://ui.shadcn.com/) -- React component system
- [Stricli Alternatives](https://bloomberg.github.io/stricli/docs/getting-started/alternatives) -- CLI framework deep comparison

### LOW Confidence (Single source, blog posts, may need verification)
- Hono memory usage claims (40% less than Express) -- from single Medium benchmark article
- tsdown maturity -- relatively new, still pre-1.0
- Vite+ preview -- announced but not released as of Feb 2026
- node-glob CVE-2025-64756 -- mentioned in one Medium article, verify with official CVE databases
