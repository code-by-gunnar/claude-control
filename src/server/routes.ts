import { Hono } from "hono";
import { scan } from "../scanner/index.js";
import { resolveSettings } from "../settings/resolver.js";
import { extractMcpServers } from "../mcp/resolver.js";
import { extractHooks, extractCommands } from "../hooks/resolver.js";
import { resolvePermissions } from "../permissions/resolver.js";
import type { ScopedSettings } from "../settings/types.js";

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
 * GET /api/hooks
 * Returns all configured hooks extracted from settings files.
 */
apiRoutes.get("/api/hooks", async (c) => {
  const result = await scan(projectDir);
  const hooksResult = extractHooks(result.files);
  return c.json(hooksResult);
});

/**
 * GET /api/commands
 * Returns all custom commands and skills from command directories.
 */
apiRoutes.get("/api/commands", async (c) => {
  const result = await scan(projectDir);
  const commandsResult = await extractCommands(result.files);
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
