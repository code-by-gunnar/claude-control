import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { scan } from "../scanner/index.js";
import { computeHealth } from "../health/resolver.js";
import { resolveSettings } from "../settings/resolver.js";
import { extractMcpServers } from "../mcp/resolver.js";
import { extractPlugins } from "../plugins/resolver.js";
import { extractHooks, extractCommands } from "../hooks/resolver.js";
import { resolveMemoryImports } from "../memory/resolver.js";
import { resolvePermissions } from "../permissions/resolver.js";
import { removePermission, addPermission } from "../permissions/writer.js";
import { setSetting } from "../settings/writer.js";
import { discoverProjects } from "../workspace/discovery.js";
import { compareProjects } from "../workspace/comparison.js";
import { extractAgents } from "../agents/resolver.js";
import { extractMarketplaces } from "../marketplace/resolver.js";
import { extractAccountInfo } from "../account/resolver.js";
import { scanAllSkills } from "../skills/scanner.js";
import type { ScopedSettings } from "../settings/types.js";

// Read version from package.json at module load time.
// Walk up from the current file to find the nearest package.json.
const __filename = fileURLToPath(import.meta.url);
let CLI_VERSION = "unknown";
let searchDir = path.dirname(__filename);
for (let i = 0; i < 5; i++) {
  const candidate = path.join(searchDir, "package.json");
  if (fsSync.existsSync(candidate)) {
    const pkg = JSON.parse(fsSync.readFileSync(candidate, "utf-8")) as { version?: string };
    if (pkg.version) {
      CLI_VERSION = pkg.version;
      break;
    }
  }
  searchDir = path.dirname(searchDir);
}

/**
 * Module-level project directory, set by the server at startup.
 */
let projectDir: string = process.cwd();

/**
 * Set the project directory used by all API routes.
 *
 * @param dir - Absolute path to the project root
 */
export function setProjectDir(dir: string): void {
  projectDir = dir;
}

/**
 * Hono router providing REST API endpoints for all scanner/resolver data.
 *
 * Each endpoint follows the same pattern established by the CLI commands:
 * scan -> filter -> resolve -> return JSON.
 */
export const apiRoutes = new Hono();

/**
 * GET /api/scan
 * Returns the full ScanResult from the scanner.
 */
apiRoutes.get("/api/scan", async (c) => {
  const result = await scan(projectDir);
  return c.json(result);
});

/**
 * GET /api/status
 * Returns just the summary portion of a scan result.
 */
apiRoutes.get("/api/status", async (c) => {
  const result = await scan(projectDir);
  return c.json(result.summary);
});

/**
 * GET /api/settings
 * Scans config files, filters settings, resolves with override chain.
 */
apiRoutes.get("/api/settings", async (c) => {
  const result = await scan(projectDir);

  // Filter for settings files that exist and have content
  const settingsFiles = result.files.filter(
    (f) =>
      f.type === "settings" &&
      f.exists &&
      f.content !== undefined &&
      f.content !== null &&
      typeof f.content === "object"
  );

  // Map each settings ConfigFile to ScopedSettings
  const scopedSettings: ScopedSettings[] = settingsFiles.map((f) => ({
    scope: f.scope,
    path: f.expectedPath,
    settings: f.content as Record<string, unknown>,
  }));

  const resolved = resolveSettings(scopedSettings);
  return c.json(resolved);
});

/**
 * POST /api/settings/set
 * Sets a single top-level setting in user-scope settings.json.
 */
apiRoutes.post("/api/settings/set", async (c) => {
  const body = await c.req.json<{ key?: string; value?: unknown }>();
  const { key, value } = body;

  if (!key || typeof key !== "string") {
    return c.json({ error: "key is required" }, 400);
  }
  if (value === undefined) {
    return c.json({ error: "value is required" }, 400);
  }

  try {
    const result = await setSetting(key.trim(), value);
    return c.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to set setting";
    return c.json({ error: msg }, 500);
  }
});

/**
 * GET /api/memory
 * Returns all CLAUDE.md files that exist, with scope, path, size, and content.
 */
apiRoutes.get("/api/memory", async (c) => {
  const result = await scan(projectDir);

  // Filter for claude-md files that exist
  const memoryFiles = result.files
    .filter((f) => f.type === "claude-md" && f.exists)
    .map((f) => ({
      scope: f.scope,
      path: f.expectedPath,
      sizeBytes: f.sizeBytes,
      content: f.content,
    }));

  return c.json(memoryFiles);
});

/**
 * GET /api/mcp
 * Returns all MCP servers extracted from config files.
 */
apiRoutes.get("/api/mcp", async (c) => {
  const result = await scan(projectDir);
  const mcpResult = await extractMcpServers(result.files);
  return c.json(mcpResult);
});

/**
 * GET /api/plugins
 * Returns all installed plugins with their contributions (MCP servers, etc.).
 */
apiRoutes.get("/api/plugins", async (c) => {
  const result = await scan(projectDir);
  const pluginsResult = await extractPlugins(result.files);
  return c.json(pluginsResult);
});

/**
 * GET /api/hooks
 * Returns all configured hooks extracted from settings files.
 */
apiRoutes.get("/api/hooks", async (c) => {
  const result = await scan(projectDir);
  const hooksResult = await extractHooks(result.files);
  return c.json(hooksResult);
});

/**
 * GET /api/commands
 * Returns all custom commands and skills from command directories.
 */
apiRoutes.get("/api/commands", async (c) => {
  const result = await scan(projectDir);
  const pluginsResult = await extractPlugins(result.files);
  const commandsResult = await extractCommands(result.files, pluginsResult.plugins);
  return c.json(commandsResult);
});

/**
 * GET /api/permissions
 * Returns resolved permissions with effective rules and override chain.
 */
apiRoutes.get("/api/permissions", async (c) => {
  const result = await scan(projectDir);
  const permissionsResult = resolvePermissions(result.files);
  return c.json(permissionsResult);
});

/**
 * POST /api/permissions/remove
 * Removes a single permission entry from a settings file.
 */
apiRoutes.post("/api/permissions/remove", async (c) => {
  try {
    const body = await c.req.json<{
      sourcePath?: string;
      rule?: string;
      raw?: string;
    }>();

    const { sourcePath, rule, raw } = body;

    if (!sourcePath || !rule || !raw) {
      return c.json(
        { error: "Missing required fields: sourcePath, rule, raw" },
        400
      );
    }

    if (rule !== "allow" && rule !== "deny" && rule !== "ask") {
      return c.json(
        { error: 'Invalid rule: must be "allow", "deny", or "ask"' },
        400
      );
    }

    const result = await removePermission(sourcePath, rule, raw);
    return c.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove permission";
    const status = message.includes("managed") ? 403 : 500;
    return c.json({ error: message }, status);
  }
});

/**
 * POST /api/permissions/add
 * Adds a single permission entry to user-scope settings.json.
 */
apiRoutes.post("/api/permissions/add", async (c) => {
  const body = await c.req.json<{
    tool?: string;
    rule?: string;
    pattern?: string;
  }>();
  const { tool, rule, pattern } = body;

  if (!tool || typeof tool !== "string") {
    return c.json({ error: "tool is required" }, 400);
  }
  if (!rule || !["allow", "deny", "ask"].includes(rule)) {
    return c.json({ error: "rule must be allow, deny, or ask" }, 400);
  }

  try {
    const result = await addPermission(
      tool.trim(),
      rule as "allow" | "deny" | "ask",
      pattern?.trim() || undefined
    );
    return c.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to add permission";
    return c.json({ error: msg }, 500);
  }
});

/**
 * GET /api/memory/imports
 * Returns @import directive analysis across all CLAUDE.md files.
 */
apiRoutes.get("/api/memory/imports", async (c) => {
  const result = await scan(projectDir);
  const importResult = await resolveMemoryImports(result.files);
  return c.json(importResult);
});

/**
 * GET /api/health
 * Returns configuration health score with category breakdowns and recommendations.
 */
apiRoutes.get("/api/health", async (c) => {
  const result = await scan(projectDir);
  const healthResult = computeHealth(result);
  return c.json(healthResult);
});

/**
 * GET /api/projects?dir=<parent-dir>
 * Discovers Claude Code projects under a parent directory.
 * Returns a WorkspaceScan with all discovered projects.
 */
apiRoutes.get("/api/projects", async (c) => {
  const dir = c.req.query("dir");
  if (!dir) {
    return c.json({ error: "Missing required query parameter: dir" }, 400);
  }

  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      return c.json({ error: `Not a directory: ${dir}` }, 400);
    }
  } catch {
    return c.json({ error: `Path does not exist: ${dir}` }, 400);
  }

  const result = await discoverProjects(dir);
  return c.json(result);
});

/**
 * GET /api/compare?projects=<path1>,<path2>,...
 * Compares configurations across multiple projects.
 * Returns a ComparisonResult with side-by-side diff data.
 */
apiRoutes.get("/api/compare", async (c) => {
  const projectsParam = c.req.query("projects");
  if (!projectsParam) {
    return c.json(
      { error: "Missing required query parameter: projects (comma-separated paths)" },
      400
    );
  }

  const paths = projectsParam.split(",").map((p) => p.trim()).filter(Boolean);

  if (paths.length < 2) {
    return c.json({ error: "Need at least 2 project paths to compare" }, 400);
  }

  // Validate all paths exist and are directories
  for (const p of paths) {
    try {
      const stat = await fs.stat(p);
      if (!stat.isDirectory()) {
        return c.json({ error: `Not a directory: ${p}` }, 400);
      }
    } catch {
      return c.json({ error: `Path does not exist: ${p}` }, 400);
    }
  }

  const result = await compareProjects(paths);
  return c.json(result);
});

/**
 * GET /api/agents
 * Returns all agent .md files from ~/.claude/agents/.
 */
apiRoutes.get("/api/agents", async (c) => {
  const result = await extractAgents();
  return c.json(result);
});

/**
 * GET /api/marketplaces
 * Returns full marketplace catalog with plugin status.
 */
apiRoutes.get("/api/marketplaces", async (c) => {
  const scanResult = await scan(projectDir);
  const result = await extractMarketplaces(scanResult.files);
  return c.json(result);
});

/**
 * GET /api/account
 * Returns non-secret account info (subscription type only).
 */
apiRoutes.get("/api/account", async (c) => {
  const result = await extractAccountInfo();
  return c.json(result);
});

/**
 * GET /api/scan-skills
 * Scans all skills and commands for potential security issues.
 */
apiRoutes.get("/api/scan-skills", async (c) => {
  const result = await scan(projectDir);
  const pluginsResult = await extractPlugins(result.files);
  const commandsResult = await extractCommands(result.files, pluginsResult.plugins);
  const skillScanResult = scanAllSkills(commandsResult.commands);
  return c.json(skillScanResult);
});

/**
 * GET /api/version
 * Returns the CLI version from package.json.
 */
apiRoutes.get("/api/version", (c) => {
  return c.json({ version: CLI_VERSION });
});
