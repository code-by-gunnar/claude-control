import fs from "node:fs/promises";
import path from "node:path";
import type { ConfigFile } from "../scanner/types.js";
import { getGlobalClaudeDir } from "../scanner/paths.js";
import { parseJsonc } from "../scanner/parser.js";
import type { McpDuplicate, McpResult, McpServer } from "./types.js";

/**
 * Scope priority for sorting: project first (highest priority), then user, managed last.
 * Lower index = higher priority.
 */
const SCOPE_PRIORITY: Record<string, number> = {
  project: 0,
  local: 1,
  user: 2,
  managed: 3,
};

/**
 * Mask a header value if it looks like a secret.
 *
 * Masks values containing `${`, starting with `sk-`, or starting with `Bearer`.
 */
function maskHeaderValue(value: string): string {
  if (
    value.includes("${") ||
    value.startsWith("sk-") ||
    value.startsWith("Bearer")
  ) {
    return "***";
  }
  return value;
}

/**
 * Mask all environment variable values as `***`.
 */
function maskEnvValues(
  env: Record<string, unknown>
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const key of Object.keys(env)) {
    masked[key] = "***";
  }
  return masked;
}

/**
 * Mask header values that look like secrets.
 */
function maskHeaders(
  headers: Record<string, unknown>
): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    masked[key] = maskHeaderValue(String(value));
  }
  return masked;
}

/**
 * Determine whether a server config entry is command-based or http-based.
 */
function determineServerType(
  entry: Record<string, unknown>
): "command" | "http" {
  if (entry.command) return "command";
  if (entry.type === "http" || entry.url) return "http";
  return "command"; // default fallback
}

/**
 * Extract MCP servers from a single parsed config object.
 *
 * Handles two formats:
 * - **Direct format**: `{ "serverName": { command, args } }` — keys at root are server names
 * - **Wrapped format**: `{ "mcpServers": { "serverName": { type, url } } }` — servers under mcpServers key
 */
function extractFromContent(
  content: Record<string, unknown>,
  scope: ConfigFile["scope"],
  sourcePath: string
): McpServer[] {
  const servers: McpServer[] = [];

  // Determine which object holds server entries
  let serverEntries: Record<string, unknown>;

  if (
    content.mcpServers &&
    typeof content.mcpServers === "object" &&
    !Array.isArray(content.mcpServers)
  ) {
    // Wrapped format: { mcpServers: { ... } }
    serverEntries = content.mcpServers as Record<string, unknown>;
  } else {
    // Direct format: all top-level keys are server names
    serverEntries = content;
  }

  for (const [name, raw] of Object.entries(serverEntries)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;

    const entry = raw as Record<string, unknown>;
    const type = determineServerType(entry);

    const server: McpServer = {
      name,
      scope,
      sourcePath,
      type,
    };

    if (type === "command") {
      if (typeof entry.command === "string") {
        server.command = entry.command;
      }
      if (Array.isArray(entry.args)) {
        server.args = entry.args.map(String);
      }
    } else {
      // http type
      if (typeof entry.url === "string") {
        server.url = entry.url;
      }
      if (entry.headers && typeof entry.headers === "object") {
        server.headers = maskHeaders(
          entry.headers as Record<string, unknown>
        );
      }
    }

    // Environment variables (both types can have env)
    if (entry.env && typeof entry.env === "object") {
      server.env = maskEnvValues(entry.env as Record<string, unknown>);
    }

    servers.push(server);
  }

  return servers;
}

/**
 * Extract all MCP servers from scanned configuration files.
 *
 * Processes both `.mcp.json` files (type === "mcp") and `settings.json`
 * files (type === "settings") that contain an `mcpServers` key.
 *
 * Returns servers sorted by scope priority (project first), then name.
 * Detects duplicate server names across files.
 *
 * @param files - All scanned configuration files from a scan() call
 * @returns McpResult with servers and duplicates
 */
export async function extractMcpServers(files: ConfigFile[]): Promise<McpResult> {
  const allServers: McpServer[] = [];

  // 1. Extract from .mcp.json files
  const mcpFiles = files.filter(
    (f) =>
      f.type === "mcp" &&
      f.exists &&
      f.readable &&
      f.content !== undefined &&
      f.content !== null &&
      typeof f.content === "object"
  );

  for (const file of mcpFiles) {
    const servers = extractFromContent(
      file.content as Record<string, unknown>,
      file.scope,
      file.expectedPath
    );
    allServers.push(...servers);
  }

  // 2. Extract from settings.json files that have mcpServers key
  const settingsFiles = files.filter(
    (f) =>
      f.type === "settings" &&
      f.exists &&
      f.readable &&
      f.content !== undefined &&
      f.content !== null &&
      typeof f.content === "object"
  );

  for (const file of settingsFiles) {
    const content = file.content as Record<string, unknown>;
    if (
      content.mcpServers &&
      typeof content.mcpServers === "object" &&
      !Array.isArray(content.mcpServers)
    ) {
      const servers = extractFromContent(
        content,
        file.scope,
        file.expectedPath
      );
      allServers.push(...servers);
    }
  }

  // 3. Extract from enabled Claude Code plugins
  // Plugins store .mcp.json in ~/.claude/plugins/marketplaces/{marketplace}/external_plugins/{name}/
  for (const file of settingsFiles) {
    const content = file.content as Record<string, unknown>;
    if (content.enabledPlugins && typeof content.enabledPlugins === "object") {
      const enabledPlugins = content.enabledPlugins as Record<string, boolean>;
      const globalDir = getGlobalClaudeDir();

      const pluginPromises = Object.entries(enabledPlugins)
        .filter(([, enabled]) => enabled)
        .map(async ([pluginKey]) => {
          // pluginKey format: "name@marketplace" e.g., "context7@claude-plugins-official"
          const atIndex = pluginKey.lastIndexOf("@");
          if (atIndex <= 0) return [];
          const name = pluginKey.slice(0, atIndex);
          const marketplace = pluginKey.slice(atIndex + 1);

          const pluginMcpPath = path.join(
            globalDir, "plugins", "marketplaces", marketplace,
            "external_plugins", name, ".mcp.json"
          );

          try {
            await fs.access(pluginMcpPath);
            const { data } = await parseJsonc(pluginMcpPath);
            if (data && typeof data === "object") {
              return extractFromContent(
                data as Record<string, unknown>,
                "user",
                pluginMcpPath
              );
            }
          } catch {
            // Plugin .mcp.json not found — skip
          }
          return [];
        });

      const pluginResults = await Promise.all(pluginPromises);
      for (const servers of pluginResults) {
        allServers.push(...servers);
      }
    }
  }

  // 4. Sort by scope priority (project first), then by name
  allServers.sort((a, b) => {
    const aPriority = SCOPE_PRIORITY[a.scope] ?? 99;
    const bPriority = SCOPE_PRIORITY[b.scope] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });

  // 4. Detect duplicates: server names appearing in 2+ files
  const nameMap = new Map<
    string,
    Array<{ scope: McpServer["scope"]; sourcePath: string }>
  >();

  for (const server of allServers) {
    const key = server.name;
    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    const existing = nameMap.get(key)!;
    // Only add if this scope+path combo not already present
    const alreadyTracked = existing.some(
      (e) => e.scope === server.scope && e.sourcePath === server.sourcePath
    );
    if (!alreadyTracked) {
      existing.push({ scope: server.scope, sourcePath: server.sourcePath });
    }
  }

  const duplicates: McpDuplicate[] = [];
  for (const [name, locations] of nameMap) {
    if (locations.length > 1) {
      duplicates.push({ name, locations });
    }
  }

  return {
    servers: allServers,
    duplicates,
  };
}
