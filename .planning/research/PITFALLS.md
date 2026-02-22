# PITFALLS.md -- Common Mistakes Building Config Inspectors, File Scanners, and Local Web Dashboards

> Research date: 2026-02-22
> Domain: Developer tool -- configuration inspector/dashboard (Claude Control)
> Methodology: Web research of post-mortems, bug trackers, community discussions, and expert warnings

---

## Table of Contents

1. [Critical Pitfalls (Top 7)](#critical-pitfalls-top-7)
2. [Technical Debt Patterns](#technical-debt-patterns)
3. [Integration Gotchas](#integration-gotchas)
4. [Performance Traps](#performance-traps)
5. [Security Mistakes](#security-mistakes)
6. [UX Pitfalls](#ux-pitfalls)
7. ["Looks Done But Isn't" Checklist](#looks-done-but-isnt-checklist)
8. [Recovery Strategies](#recovery-strategies)
9. [Pitfall-to-Phase Mapping](#pitfall-to-phase-mapping)
10. [Sources](#sources)

---

## Critical Pitfalls (Top 7)

### 1. Cross-Platform Path Handling Is Deeper Than You Think

**What goes wrong:** The tool works on the developer's machine (usually macOS) but breaks on Windows or Linux in subtle, hard-to-reproduce ways. Path separators, case sensitivity, drive letters, Unicode usernames, OneDrive-redirected home directories, and symlinks/junction points all behave differently.

**Why it happens:** Developers build on one platform and test superficially on others. Node.js normalizes *some* path issues but not all. String manipulation of paths (splitting on `/`, concatenating with template literals) bypasses `path.join()` and `path.resolve()` safety nets. `os.homedir()` itself has documented bugs on Windows -- returning non-existent paths when usernames contain non-ASCII Unicode characters (Node.js issue #17586), returning stale/wrong paths (Node.js issue #51984), and preferring USERPROFILE over HOME inconsistently (Node.js issue #13818).

**How to avoid:**
- NEVER construct paths with string concatenation or template literals. Always use `path.join()` and `path.resolve()`.
- NEVER split paths on `/` or `\`. Use `path.parse()` and `path.format()`.
- NEVER assume case sensitivity. macOS HFS+ is case-insensitive by default, but HFSX is case-sensitive. Linux ext4 is case-sensitive. Windows NTFS is case-insensitive. Do not infer filesystem behavior from `process.platform`.
- Validate that `os.homedir()` actually exists on disk before using it. Have a fallback strategy.
- Test with Unicode usernames (e.g., `C:\Users\Bjorn` vs `C:\Users\BJRN~1`).
- Test on Windows machines with OneDrive-redirected folders (corporate environments).
- Use `path.posix` and `path.win32` explicitly when constructing paths for display vs. filesystem operations.

**Warning signs:** Tests only run on CI with one OS. No Windows developer on the team. Path strings appear in code without `path.join()`. Hardcoded `/` or `\` separators.

**Phase:** Foundation (Phase 1). Must be correct from the start; retrofitting is extremely painful.

**Confidence:** HIGH -- based on Node.js official documentation, multiple filed bugs, and the cross-platform Node.js community guide by Domenic Denicola.

---

### 2. Scanning User Home Directories Is a Minefield

**What goes wrong:** The scanner is slow (traversing too many files), misses hidden files, follows symlinks into infinite loops, triggers antivirus software, reads files it shouldn't, or crashes on permission-denied errors. On Windows, hidden files use a filesystem attribute (not dot-prefix), and detecting them requires OS-specific calls.

**Why it happens:** Home directories are large, messy, and contain surprises. `~/.claude/` may not exist. It may be a symlink. Other processes may be writing to config files simultaneously. Antivirus may quarantine files during scanning. Corporate environments may have restricted folder access.

**How to avoid:**
- Scan only known, specific paths (e.g., `~/.claude/settings.json`, `.claude/settings.json`). Do NOT recursively walk the entire home directory.
- Use targeted file reads, not directory traversal. You know the exact file names Claude Code uses.
- Wrap every file read in try/catch. Handle ENOENT, EACCES, EPERM, EISDIR, EMFILE gracefully.
- Use `fs.promises` (async) to avoid blocking the event loop during scanning.
- Set timeouts on file operations to handle hung network drives or OneDrive-synced folders.
- On Windows, hidden file detection requires checking the FILE_ATTRIBUTE_HIDDEN attribute, not just the dot prefix.
- Never follow symlinks blindly. Use `fs.lstat()` to detect them, then decide whether to follow.

**Warning signs:** Scanner takes > 500ms on a clean system. No error handling around file reads. Using `fs.readdirSync` recursively. No tests for "file doesn't exist" case.

**Phase:** Foundation (Phase 1). The scanner is the core of the tool.

**Confidence:** HIGH -- based on Node.js docs, `hidefile` npm package documentation, and chokidar issue tracker experience.

---

### 3. JSONC/JSON5 Parsing vs. Strict JSON Mismatch

**What goes wrong:** Claude Code's `settings.json` files may contain comments and trailing commas (VS Code convention, JSONC format). Standard `JSON.parse()` chokes on these. The tool either crashes with an unhelpful "Unexpected token" error, or silently strips comments and loses fidelity.

**Why it happens:** VS Code popularized JSONC (JSON with Comments) for configuration files. Claude Code follows this convention. But `JSON.parse()` is strict RFC 8259 JSON. Developers assume "it's just JSON" without testing with real-world config files that have comments, trailing commas, or UTF-8 BOM bytes.

**How to avoid:**
- Use a JSONC parser (e.g., `jsonc-parser` from VS Code, or `json5` package) for all config file reading.
- Strip UTF-8 BOM before parsing: check `charCodeAt(0) === 0xFEFF` and slice if present, or use `.replace(/^\uFEFF/, '')`.
- Provide clear error messages when parsing fails, including the file path, line number, and a suggestion to check for syntax errors.
- Display the raw file content alongside parsed content so users can see what failed.
- Consider preserving comments in display mode (since this is a read-only inspector).

**Warning signs:** Tests use hand-crafted JSON without comments. No test for BOM-encoded files. Error messages say "Unexpected token" without context.

**Phase:** Foundation (Phase 1). Config parsing is the first thing users will encounter.

**Confidence:** HIGH -- based on JSONC specification, VS Code issue #102061, Node.js issue #20649 (BOM handling), and JSON trailing comma RFC 8259 documentation.

---

### 4. Port Conflicts and Localhost Server Lifecycle

**What goes wrong:** The web dashboard fails to start because port 3000 (or whatever default) is already in use. Or it starts but doesn't clean up on exit, leaving a zombie process holding the port. Or the user runs multiple instances and they silently conflict. On Windows, SIGTERM handling is different from Unix.

**Why it happens:** Local developer tools compete for common ports. Node.js signal handling differs across platforms. Windows doesn't support SIGTERM the same way. Developers forget to implement graceful shutdown. Process managers (pm2, Docker) send different signals.

**How to avoid:**
- Implement automatic port detection with fallback (like Vite does: "Port 3000 is in use, trying 3001...").
- Use `detect-port` or similar to find an available port before binding.
- Implement graceful shutdown handlers for SIGTERM, SIGINT, and `process.on('exit')`.
- On Windows, also handle `SIGHUP` and the `beforeExit` event.
- Store the active port in a lockfile (e.g., `~/.claude-control.lock`) so the CLI can find the running server.
- Set a forced shutdown timeout (10 seconds) to prevent hung processes.
- Print the URL clearly on startup so the user knows where to connect.

**Warning signs:** No `process.on('SIGTERM')` handler. No `server.close()` call on shutdown. Hardcoded port number. No lockfile mechanism.

**Phase:** Phase 2 (Web Dashboard). But design the port management early.

**Confidence:** HIGH -- based on Express.js graceful shutdown documentation, Vite server options docs, and Node.js signal handling guides.

---

### 5. Setup Friction Kills Adoption Before Users See Your Features

**What goes wrong:** The tool requires global npm install (`npm install -g`), which triggers permission errors, PATH issues, or conflicts with nvm/fnm/volta. Users on corporate machines can't install global packages. The first-run experience takes > 5 minutes or requires manual configuration.

**Why it happens:** Global npm install is a known pain point. Windows PATH configuration for globally installed npm packages has documented bugs (missing `\bin` suffix). Different Node.js version managers (nvm, fnm, volta, mise) handle global packages differently. Corporate environments restrict global installs.

**How to avoid:**
- Support `npx claude-ctl` as the primary zero-install experience. npx downloads and runs without global install.
- If global install is needed, provide clear troubleshooting for common PATH issues.
- Target `npm create claude-control` pattern for project initialization if applicable.
- Ensure the tool works with Node.js LTS versions (currently 20.x and 22.x).
- Test installation on clean machines, including Windows with restricted permissions.
- The README must show a working command in the first 10 seconds of reading. 40.6% of early adopters abandon if setup is painful (CatchyAgency study of 202 open-source developers).

**Warning signs:** README starts with prerequisites instead of a one-liner. Install instructions have > 3 steps. No `npx` support. Requires specific Node.js version.

**Phase:** Phase 1 (CLI Foundation). Package.json bin field and npx support must be correct from day one.

**Confidence:** HIGH -- based on npm CLI issue tracker (#6714 PATH issues, #8480 Windows corruption), Eric Lathrop's "Problem with npm install --global", and CatchyAgency's developer survey data.

---

### 6. Read-Only Promise Is Harder to Keep Than You Think

**What goes wrong:** A tool marketed as "read-only" accidentally writes files (temp files, cache files, lockfiles), modifies timestamps (atime on reads), or has code paths that could write if a bug is introduced. Users lose trust when a "read-only inspector" touches their configuration.

**Why it happens:** Logging creates files. Caching creates files. Error handling may create crash dumps. `fs.readFile` updates the access time (atime) on some filesystems. Future feature branches accidentally add write operations. Dependencies may write temp files.

**How to avoid:**
- Enforce read-only at the architecture level: the scanning module should have NO access to `fs.writeFile`, `fs.mkdir`, `fs.appendFile`, or any write API. Use TypeScript's type system to enforce this.
- Create an explicit "SafeReader" wrapper that only exposes `readFile`, `readdir`, `stat`, `lstat`, and `access`.
- If the tool needs to write anything (lockfiles, cache), do it ONLY in its own directory (`~/.claude-control/`), never in the user's config directories.
- Document the read-only guarantee clearly. "This tool will never modify your configuration files."
- Add integration tests that verify no files are written outside the tool's own directory.
- Consider using `O_NOATIME` flag on Linux to avoid updating access times (requires ownership or CAP_FOWNER).

**Warning signs:** No clear boundary between "reading" and "writing" code. Dependencies that create temp files. No test asserting read-only behavior.

**Phase:** Foundation (Phase 1). This is a trust contract with users.

**Confidence:** HIGH -- based on Cursor Plan Mode bypass vulnerability (documented in opencode issue #2142, Cursor destructive operations incident), demonstrating that read-only guarantees require architectural enforcement, not just flag-checking.

---

### 7. Config Hierarchy Display Without Context Is Useless

**What goes wrong:** The tool shows all configuration files but doesn't explain which one "wins." Claude Code has a complex precedence hierarchy (user > project > project-local, with per-project overrides in `~/.claude.json`). Showing raw files without explaining effective configuration is like showing assembly code instead of source.

**Why it happens:** Displaying files is the easy part. Computing the effective merged configuration requires understanding Claude Code's exact precedence rules, which may change across versions. Developers ship the "show files" feature and postpone the "explain precedence" feature, but users need the latter more.

**How to avoid:**
- Research and document Claude Code's exact configuration precedence (user settings < project settings < project-local settings, with specific override rules for permissions).
- Display both the raw files AND the computed effective configuration.
- Highlight conflicts: when a setting in one file overrides another, show both values and which one wins.
- Color-code or visually distinguish the source of each effective setting.
- Plan for Claude Code's precedence rules to change -- make the precedence logic configurable or version-aware.

**Warning signs:** The UI shows a list of files but no merged view. No documentation about precedence. Users ask "which setting is actually active?"

**Phase:** Phase 2 (Enhanced Scanning). Build file display in Phase 1, add precedence computation in Phase 2.

**Confidence:** MEDIUM -- based on Claude Code settings documentation (code.claude.com/docs/en/settings), which describes the hierarchy but leaves some precedence details implicit. The exact merge semantics may need reverse-engineering.

---

## Technical Debt Patterns

### TD-1: String-Based Path Manipulation
**Pattern:** Using template literals, `split('/')`, or regex to manipulate file paths instead of `path.join()`, `path.resolve()`, `path.parse()`.
**Consequence:** Works on developer's OS, fails on others. Extremely tedious to fix after the fact because paths flow through the entire codebase.
**Prevention:** Lint rule banning string path construction. Wrapper functions that enforce `path.*` usage.

### TD-2: Synchronous File Operations in Hot Paths
**Pattern:** Using `fs.readFileSync()` in the scanner or server request handlers.
**Consequence:** Blocks the event loop. Web dashboard becomes unresponsive during scanning. CLI freezes on slow/network filesystems.
**Prevention:** Use `fs.promises.*` everywhere. Ban sync APIs via ESLint rule (`no-sync`).

### TD-3: Hardcoded Configuration Assumptions
**Pattern:** Hardcoding file paths like `~/.claude/settings.json` instead of building them from documented Claude Code conventions.
**Consequence:** Breaks when Claude Code changes its config structure (which it has already done -- see issue #1202 about documentation errors in settings location).
**Prevention:** Centralize all path constants in a single module. Make them configurable. Version-tag them.

### TD-4: Missing Error Types
**Pattern:** Catching all errors with generic `catch(e)` and logging `e.message`.
**Consequence:** Permission errors, encoding errors, and "file not found" errors all look the same to users. Debugging becomes guesswork.
**Prevention:** Define typed errors (ConfigNotFoundError, ConfigParseError, PermissionDeniedError). Include file path, attempted operation, and suggested fix in every error.

### TD-5: TypeScript `any` Escape Hatches
**Pattern:** Using `any` type for parsed config objects because the schema is complex or unknown.
**Consequence:** Defeats TypeScript's purpose. Bugs in config access silently pass type checking. Refactoring becomes dangerous.
**Prevention:** Define interfaces for all known Claude Code config structures. Use `unknown` instead of `any` for truly unknown shapes, with runtime validation (zod, io-ts, or manual checks).

### TD-6: No Integration Tests Against Real Config Files
**Pattern:** Unit tests with hand-crafted mock config objects. No tests against actual Claude Code configuration files.
**Consequence:** Parser works for the test fixtures but fails on real-world configs with comments, BOM, unusual formatting, or unexpected fields.
**Prevention:** Include a `fixtures/` directory with realistic config files (with comments, trailing commas, BOM, empty files, very large files, Unicode content). Test against every fixture.

---

## Integration Gotchas

### IG-1: Claude Code Config Structure Changes Without Notice
Claude Code is actively developed. The configuration file structure, location, and semantics can change between versions. There is no stable API for reading Claude Code configuration. The tool must be resilient to:
- New fields appearing in settings.json
- Fields being renamed or relocated
- New configuration files being added
- File location changes (already documented in issue #1202)

**Mitigation:** Parse with a lenient schema. Display unknown fields as "unrecognized" rather than ignoring or crashing. Version-tag the known schema.

### IG-2: MCP Server Configuration Is Nested and Complex
MCP server definitions in Claude Code config include server names, command strings, arguments, environment variables, and scope metadata. This is deeply nested JSON that's easy to parse incorrectly or display in an unusable way.

**Mitigation:** Design specific UI components for MCP server display. Don't rely on generic JSON tree rendering.

### IG-3: `.claude.json` Contains Sensitive Data
The `~/.claude.json` file contains OAuth session tokens and potentially other sensitive data alongside configuration. A config inspector must either:
- Skip sensitive fields explicitly (requires knowing which ones are sensitive)
- Redact tokens/secrets by pattern matching (risky -- may miss new fields)
- Warn the user that sensitive data is being displayed

**Mitigation:** Implement a redaction layer that masks anything that looks like a token, key, or secret. Err on the side of over-redacting.

### IG-4: CLAUDE.md Files Can Be Anywhere in the Directory Tree
CLAUDE.md files are not just in `~/.claude/` and `.claude/`. They can exist at the project root, in subdirectories, and their content can be large (instructions for the entire project). The scanner must handle:
- Very large CLAUDE.md files (potentially hundreds of KB)
- CLAUDE.md files at multiple directory levels
- Binary-looking CLAUDE.md files (rare but possible)

**Mitigation:** Set a size limit for display (e.g., first 50KB with a "truncated" warning). Detect binary content. Show the file tree structure, not just contents.

### IG-5: Hooks and Skills May Reference External Commands
Claude Code hooks can reference shell commands, scripts, and external tools. Displaying these is fine, but if the inspector ever validates or tests hooks, it risks executing arbitrary commands.

**Mitigation:** In read-only v1, display hooks as text only. Never execute, validate, or syntax-check hook commands. Clearly label them as "configuration display only."

---

## Performance Traps

### PT-1: Scanning on Every Page Load
**Trap:** Re-scanning all configuration files on every web dashboard page load or CLI invocation.
**Impact:** 100-500ms delay per request on fast systems, seconds on slow/network filesystems.
**Fix:** Scan once, cache results, invalidate on file change (using `fs.watch` with platform-appropriate settings). For CLI: scan once per invocation (acceptable). For web: scan on startup + watch for changes.

### PT-2: File Watcher Resource Exhaustion
**Trap:** Watching too many directories or files, hitting inotify limits (Linux), FSEvents limits (macOS, ~450 system-wide), or file descriptor limits.
**Impact:** Cryptic ENOSPC errors on Linux. Silent failures on macOS. Memory leaks.
**Fix:** Watch only the specific directories you need (`~/.claude/`, `.claude/`, project root for CLAUDE.md). Do NOT recursively watch. The number of files Claude Control needs to watch is small (< 20).

### PT-3: Blocking the Event Loop During JSON Parsing
**Trap:** Parsing very large config files synchronously on the main thread.
**Impact:** Web dashboard freezes. CLI becomes unresponsive.
**Fix:** Use async file reading. Set size limits (skip files > 1MB with a warning). For the web dashboard, parse in a background task.

### PT-4: Sending Full Config Over HTTP on Every Request
**Trap:** The API endpoint returns all parsed configuration data on every request, even when only a subset changed.
**Impact:** Unnecessary bandwidth, slow page loads, wasted CPU time re-serializing.
**Fix:** Design the API with granular endpoints (e.g., `/api/settings/user`, `/api/settings/project`, `/api/mcp-servers`). Support ETags or last-modified headers for caching. Consider WebSocket for live updates instead of polling.

### PT-5: Frontend Re-renders on Large Config Trees
**Trap:** Rendering a deeply nested JSON tree with thousands of nodes causes the browser to lag.
**Impact:** Dashboard feels sluggish. Users blame the tool.
**Fix:** Use virtualized rendering (only render visible nodes). Collapse deep subtrees by default. Paginate or truncate very large values.

---

## Security Mistakes

### SM-1: DNS Rebinding Attacks on Localhost Server
**Threat:** A malicious website can use DNS rebinding to access the locally-running dashboard server, potentially reading configuration data that includes sensitive information.
**Severity:** HIGH. This is the same class of vulnerability that affected MCP servers (GHSA-9h52-p55h-vw2f for Python SDK, GHSA-w48q-cv73-mx4w for TypeScript SDK).
**Mitigation:**
- Validate the `Host` header on all requests. Reject requests where Host is not `localhost`, `127.0.0.1`, or `[::1]`.
- Validate the `Origin` header on all requests. Reject cross-origin requests.
- Bind to `127.0.0.1` only, not `0.0.0.0`.
- Consider requiring a per-session token in the URL or headers.

### SM-2: Exposing OAuth Tokens and Secrets
**Threat:** `~/.claude.json` contains OAuth session data. Displaying this in the web dashboard exposes it to any script running in the browser, any browser extension, or anyone who can see the screen.
**Severity:** HIGH.
**Mitigation:** Redact all token-like values by default. Require explicit user action to reveal (click-to-copy with confirmation). Never log tokens to console or server logs.

### SM-3: Path Traversal via API Parameters
**Threat:** If the API accepts file paths as parameters (e.g., "show me this config file"), an attacker could request `/etc/passwd` or `C:\Windows\System32\config\SAM`.
**Severity:** HIGH.
**Mitigation:** Whitelist the exact files the tool can read. Never accept arbitrary file paths from the frontend. The backend should determine which files to read based on known Claude Code config locations, not user input.

### SM-4: CORS Misconfiguration
**Threat:** Setting `Access-Control-Allow-Origin: *` on the local API allows any website to read configuration data from the dashboard.
**Severity:** MEDIUM.
**Mitigation:** Do not set CORS headers at all (the dashboard frontend is served from the same origin). If CORS is needed for development, restrict to `http://localhost:*` only and remove in production builds.

### SM-5: Server Running After User Thinks It's Stopped
**Threat:** The server process doesn't shut down cleanly, continuing to serve configuration data after the user closes the terminal or CLI.
**Severity:** MEDIUM.
**Mitigation:** Implement robust shutdown handlers. Use a PID/lockfile. Add a `/api/shutdown` endpoint (authenticated). Consider a heartbeat mechanism that auto-shuts down after inactivity.

---

## UX Pitfalls

### UX-1: Wall of JSON
**Problem:** Showing raw JSON dumps for configuration files. Users drown in curly braces and can't find what they need.
**Fix:** Structured views with sections (permissions, environment variables, MCP servers, hooks). Use collapsible sections. Highlight the most important/unusual settings.

### UX-2: No "So What?" Factor
**Problem:** The tool shows configuration but doesn't explain what it means. Users see `"allowedTools": ["mcp__*"]` but don't know if that's normal, risky, or important.
**Fix:** Add contextual help. Highlight non-default values. Show descriptions for known settings. Flag potential issues (e.g., overly permissive permissions).

### UX-3: Cryptic Error Messages
**Problem:** "Error: ENOENT: no such file or directory" is meaningless to non-expert users.
**Fix:** Translate every system error into a human-readable message: "Could not find settings.json at ~/.claude/settings.json. This file is created when you first configure Claude Code. No action needed if you haven't configured global settings yet."

### UX-4: No Empty State
**Problem:** When Claude Code isn't configured (no `~/.claude/` directory, no `.claude/` in the project), the tool shows a blank page or cryptic errors.
**Fix:** Design an explicit empty state: "No Claude Code configuration found. Here's where Claude Code stores its settings and how to create your first configuration."

### UX-5: CLI Output Not Designed for Piping
**Problem:** CLI output includes colors, spinners, and decorative formatting that breaks when piped to `grep`, `jq`, or other tools.
**Fix:** Detect when stdout is not a TTY (`!process.stdout.isTTY`). In non-TTY mode, output plain text or JSON without ANSI escape codes. Support `--json` and `--no-color` flags.

### UX-6: Information Overload in v1
**Problem:** Trying to show everything at once: every config file, every setting, every MCP server, every hook, every permission. Users can't find what they need.
**Fix:** Start with a summary/overview page. Progressive disclosure: show the big picture first, let users drill into details. The most common use case is "what MCP servers are configured?" or "what permissions are set?" -- optimize for those.

### UX-7: Web Dashboard Doesn't Work Without JavaScript
**Problem:** If the dashboard is a SPA that requires JavaScript to render, it won't work in restricted environments (corporate proxies that strip JS, accessibility tools, terminal-based browsers).
**Fix:** For v1, this is acceptable. But consider server-side rendering for critical information. Ensure the CLI provides full feature parity for users who can't use the web dashboard.

---

## "Looks Done But Isn't" Checklist

These are features that appear complete in a demo but fail in real-world usage:

- [ ] **Config file with comments**: Does the parser handle JSONC comments (`//` and `/* */`)? Trailing commas?
- [ ] **Config file with BOM**: Does the parser handle UTF-8 BOM (byte order mark) at the start of the file?
- [ ] **Config file doesn't exist**: Does the tool show a helpful empty state, not a crash?
- [ ] **Config file is empty**: Does `JSON.parse('')` get caught? (It throws.)
- [ ] **Config file has wrong permissions**: Does EACCES get caught and explained?
- [ ] **Config file is a symlink**: Does the tool follow it? Does it show the resolved path?
- [ ] **Config file is being written by another process**: Does the tool handle partial reads or locked files?
- [ ] **Home directory is on a network drive**: Does the scan timeout gracefully?
- [ ] **Home directory is OneDrive-redirected**: Does `os.homedir()` return the right path?
- [ ] **Username contains Unicode**: Does `os.homedir()` return a path that exists?
- [ ] **Windows paths with spaces**: Does `C:\Users\John Doe\.claude\settings.json` work?
- [ ] **Multiple Claude Code projects open**: Does the tool detect the right project context?
- [ ] **Port already in use**: Does the web server try the next port, or crash?
- [ ] **Ctrl+C during startup**: Does the tool clean up, or leave zombie processes?
- [ ] **Very large CLAUDE.md file**: Does the tool truncate or crash?
- [ ] **settings.json with unknown fields**: Are they displayed or silently dropped?
- [ ] **Mixed line endings (CRLF/LF)**: Does display rendering handle both?
- [ ] **Piped CLI output**: Is ANSI stripped when stdout is not a TTY?
- [ ] **No Node.js on PATH**: Does `npx` work? Does the error message explain what's needed?
- [ ] **Stale cache after config change**: Does the dashboard update when files change on disk?
- [ ] **Token/secret in config**: Is it redacted in both web dashboard and CLI output?
- [ ] **Browser doesn't open automatically**: Is the URL printed to the terminal?
- [ ] **Two instances running simultaneously**: Do they conflict or coexist?

---

## Recovery Strategies

### When You Discover a Cross-Platform Bug in Production

1. **Don't panic-fix with platform checks.** `if (process.platform === 'win32')` scattered throughout the code is a maintenance nightmare.
2. **Instead:** Create a platform abstraction layer. Move all platform-specific logic into a single module. Test it independently.
3. **Immediately:** Add CI jobs for all three platforms (Windows, macOS, Linux). This should have been there from the start.

### When Config Parsing Breaks on Real Files

1. **Collect the failing file** (with user permission, redacted).
2. **Add it to the test fixtures** directory.
3. **Fix the parser, not the test.** The parser should handle whatever users throw at it.
4. **Consider using `jsonc-parser`** (from VS Code) which is battle-tested against millions of VS Code config files.

### When the Web Dashboard Has a Security Vulnerability

1. **Disable the server immediately** in a patch release.
2. **Audit all API endpoints** for the same class of vulnerability.
3. **Add Host header validation** and Origin header checking as baseline security.
4. **Consider whether the dashboard needs to exist** in v1, or if the CLI alone is sufficient for the initial release.

### When Users Report "It's Slow"

1. **Profile before optimizing.** Use Node.js `--prof` or `clinic.js` to find the actual bottleneck.
2. **Common culprits:** Synchronous file I/O, re-scanning on every request, parsing large files repeatedly, unthrottled file watchers.
3. **Quick win:** Add caching with a short TTL (5 seconds for web, none needed for CLI).

### When npm Install Breaks on a Platform

1. **Support `npx` as primary install method** -- it bypasses most global install issues.
2. **Document platform-specific install workarounds** in a TROUBLESHOOTING.md.
3. **Consider publishing a standalone binary** using `pkg` or `sea` (Node.js Single Executable Application) for platforms where npm is problematic.

---

## Pitfall-to-Phase Mapping

| Pitfall | Phase 1 (CLI) | Phase 2 (Web) | Phase 3 (Enhanced) |
|---------|:-------------:|:--------------:|:------------------:|
| Cross-platform paths | MUST FIX | -- | -- |
| Home directory scanning | MUST FIX | -- | -- |
| JSONC/BOM parsing | MUST FIX | -- | -- |
| Port conflicts | Design | MUST FIX | -- |
| Install friction (npx) | MUST FIX | -- | -- |
| Read-only guarantee | MUST FIX | MUST FIX | Verify |
| Config precedence display | Design | MUST FIX | Enhance |
| DNS rebinding | -- | MUST FIX | -- |
| Secret redaction | MUST FIX | MUST FIX | -- |
| Path traversal prevention | -- | MUST FIX | -- |
| Graceful shutdown | -- | MUST FIX | -- |
| Empty states | MUST FIX | MUST FIX | -- |
| Error messages | MUST FIX | MUST FIX | -- |
| CLI piping support | MUST FIX | -- | -- |
| File watcher limits | -- | Design | MUST FIX |
| Performance caching | -- | Design | MUST FIX |
| Frontend rendering perf | -- | Design | MUST FIX |
| Config schema versioning | Design | -- | MUST FIX |

---

## Sources

### High Confidence (official docs, filed bugs, direct evidence)

- [Node.js: Working with Different Filesystems](https://nodejs.org/en/learn/manipulating-files/working-with-different-filesystems) -- Official Node.js guide on cross-platform filesystem behavior. HIGH.
- [Node.js `os.homedir()` returns non-existent path (Issue #51984)](https://github.com/nodejs/node/issues/51984) -- Documented Windows bug. HIGH.
- [Node.js `os.homedir()` Unicode issues (Issue #17586)](https://github.com/nodejs/node/issues/17586) -- Documented Windows Unicode bug. HIGH.
- [Node.js `fs.readFileSync` UTF-8 BOM (Issue #20649)](https://github.com/nodejs/node/issues/20649) -- BOM handling bug. HIGH.
- [npm CLI PATH issues on Windows (Discussion #6714)](https://github.com/jdx/mise/discussions/6714) -- Global install PATH problems. HIGH.
- [npm CLI Windows corruption (Issue #8480)](https://github.com/npm/cli/issues/8480) -- Recent 2025 npm install bug. HIGH.
- [MCP TypeScript SDK DNS rebinding vulnerability (GHSA-w48q-cv73-mx4w)](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-w48q-cv73-mx4w) -- Security advisory for localhost servers. HIGH.
- [MCP Python SDK DNS rebinding vulnerability (GHSA-9h52-p55h-vw2f)](https://github.com/modelcontextprotocol/python-sdk/security/advisories/GHSA-9h52-p55h-vw2f) -- Security advisory for localhost servers. HIGH.
- [Express.js Graceful Shutdown Guide](https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html) -- Official Express shutdown patterns. HIGH.
- [Vite Server Options (Port Handling)](https://vite.dev/config/server-options) -- Port conflict resolution pattern. HIGH.
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings) -- Official Claude Code config structure. HIGH.
- [Chokidar EMFILE bug with node_modules (Mocha #5374)](https://github.com/mochajs/mocha/issues/5374) -- File watcher resource exhaustion. HIGH.
- [JSONC Specification - Trailing Commas](https://jsonc.org/trailingcommas.html) -- JSONC parsing behavior. HIGH.
- [TOCTOU Race Conditions (CWE-367)](https://cwe.mitre.org/data/definitions/367.html) -- Security reference for file system race conditions. HIGH.

### Medium Confidence (expert blogs, community studies, indirect evidence)

- [Configuration Design is User Experience Design (naildrivin5.com)](https://naildrivin5.com/blog/2016/12/06/configuration-is-user-experience.html) -- Expert analysis of config UX failures. MEDIUM.
- [Google SRE Book - Configuration Design and Best Practices](https://sre.google/workbook/configuration-design/) -- Google's configuration design principles. MEDIUM.
- [What 202 Open Source Developers Taught Us About Tool Adoption (CatchyAgency)](https://www.catchyagency.com/post/what-202-open-source-developers-taught-us-about-tool-adoption) -- Survey data on adoption friction (40.6% abandon on painful setup, 30.2% on difficult setup, 27.9% on bad docs). MEDIUM.
- [Why Modern Open Source Projects Fail (Coelho & Valente, arXiv)](https://arxiv.org/pdf/1707.02327) -- Academic study of OSS failure modes. MEDIUM.
- [Eric Lathrop: The Problem with npm install --global](https://www.ericlathrop.com/2017/05/the-problem-with-npm-install-global/) -- Analysis of global install problems. MEDIUM.
- [Writing Cross-Platform Node.js (shapeshed.com)](https://shapeshed.com/writing-cross-platform-node/) -- Practical cross-platform guide. MEDIUM.
- [Tips for Writing Portable Node.js Code (Domenic Denicola)](https://gist.github.com/domenic/2790533) -- Community reference for portable Node.js. MEDIUM.
- [Cross-Platform Node.js (Alan Norbauer)](https://alan.norbauer.com/articles/cross-platform-nodejs/) -- Practical edge cases. MEDIUM.
- [The Downsides of JSON for Config Files (arp242.net)](https://www.arp242.net/json-config.html) -- Analysis of JSON config UX problems. MEDIUM.
- [DNS Rebinding Exposing Internal MCP Servers (Straiker)](https://www.straiker.ai/blog/agentic-danger-dns-rebinding-exposing-your-internal-mcp-servers) -- Security analysis of localhost server risks. MEDIUM.
- [Cursor Plan Mode Destructive Operations Bypass (MintMCP)](https://www.mintmcp.com/blog/cursor-plan-mode-destructive-operations) -- Case study of read-only mode failures. MEDIUM.
- [How to Write README Files That Actually Get Contributors](https://nmd.imporinfo.com/2025/10/how-to-write-readme-files-that-actually.html) -- First-impression optimization for OSS. MEDIUM.
- [Pitfall Chronicles: Pain of Windows Frontend Toolchain (Kevin Deng)](https://xlog.sxzz.moe/nodejs-windows-compatibility) -- Windows-specific Node.js pitfalls. MEDIUM.

### Low Confidence (general advice, extrapolated from related contexts)

- [Lessons Learned from Open Source Xara's Failure (Linux.com)](https://www.linux.com/news/lessons-learned-open-source-xaras-failure/) -- Community management lessons, not directly about dev tools. LOW.
- [6 Big Bad Mistakes in Configuration Management (DevOps.com)](https://devops.com/6-big-bad-mistakes-configuration-management-part-1/) -- Enterprise config management, not developer tools. LOW.
- [Platform Engineering Lessons Learned (InfoQ)](https://www.infoq.com/articles/platform-engineering-lessons-learned/) -- Platform engineering, partially applicable. LOW.
- [Electron Memory Leak Debugging (Various)](https://www.hendrik-erz.de/post/electron-chokidar-and-native-nodejs-modules-a-horror-story-from-integration-hell) -- Electron-specific, only relevant if we ever consider Electron. LOW.

---

*This document should be reviewed and updated as the project progresses. Each pitfall should be revisited during its relevant phase to ensure mitigations are in place.*
