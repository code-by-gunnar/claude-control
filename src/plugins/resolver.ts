import fs from "node:fs/promises";
import path from "node:path";
import type { ConfigFile } from "../scanner/types.js";
import { getGlobalClaudeDir } from "../scanner/paths.js";
import { parseJsonc } from "../scanner/parser.js";
import type { PluginInfo, PluginsResult } from "./types.js";

/**
 * Extract all plugins from scanned configuration files.
 *
 * Reads `enabledPlugins` from settings.json files, resolves the plugin
 * directory paths, checks installation status, and discovers which MCP
 * servers each plugin provides.
 *
 * @param files - All scanned configuration files from a scan() call
 * @returns PluginsResult with all discovered plugins
 */
export async function extractPlugins(files: ConfigFile[]): Promise<PluginsResult> {
  const plugins: PluginInfo[] = [];
  const seen = new Set<string>();

  const settingsFiles = files.filter(
    (f) =>
      f.type === "settings" &&
      f.exists &&
      f.readable &&
      f.content !== undefined &&
      f.content !== null &&
      typeof f.content === "object"
  );

  const globalDir = getGlobalClaudeDir();

  for (const file of settingsFiles) {
    const content = file.content as Record<string, unknown>;
    if (!content.enabledPlugins || typeof content.enabledPlugins !== "object") {
      continue;
    }

    const enabledPlugins = content.enabledPlugins as Record<string, boolean>;

    const pluginPromises = Object.entries(enabledPlugins).map(
      async ([pluginKey, enabled]) => {
        // Deduplicate across settings files — first scope wins
        if (seen.has(pluginKey)) return null;
        seen.add(pluginKey);

        const atIndex = pluginKey.lastIndexOf("@");
        if (atIndex <= 0) return null;

        const name = pluginKey.slice(0, atIndex);
        const marketplace = pluginKey.slice(atIndex + 1);

        const pluginDir = path.join(
          globalDir, "plugins", "marketplaces", marketplace,
          "external_plugins", name
        );

        const pluginMcpPath = path.join(pluginDir, ".mcp.json");

        let installed = false;
        const mcpServers: string[] = [];

        try {
          await fs.access(pluginDir);
          installed = true;

          // Try to read .mcp.json to discover MCP servers
          try {
            const { data } = await parseJsonc(pluginMcpPath);
            if (data && typeof data === "object") {
              const obj = data as Record<string, unknown>;
              // Direct format: top-level keys are server names
              // Wrapped format: mcpServers key holds server names
              const serverEntries =
                obj.mcpServers && typeof obj.mcpServers === "object"
                  ? (obj.mcpServers as Record<string, unknown>)
                  : obj;

              for (const [serverName, val] of Object.entries(serverEntries)) {
                if (val && typeof val === "object" && !Array.isArray(val)) {
                  mcpServers.push(serverName);
                }
              }
            }
          } catch {
            // No .mcp.json — plugin might only provide skills
          }
        } catch {
          // Plugin directory doesn't exist
        }

        return {
          name,
          marketplace,
          key: pluginKey,
          enabled,
          scope: file.scope,
          sourcePath: file.expectedPath,
          pluginDir,
          installed,
          mcpServers,
        } satisfies PluginInfo;
      }
    );

    const results = await Promise.all(pluginPromises);
    for (const plugin of results) {
      if (plugin) plugins.push(plugin);
    }
  }

  // Sort: enabled first, then alphabetically
  plugins.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    plugins,
    totalCount: plugins.length,
    enabledCount: plugins.filter((p) => p.enabled).length,
    installedCount: plugins.filter((p) => p.installed).length,
  };
}

/**
 * Check if a source path belongs to a plugin, and return the plugin name if so.
 *
 * @param sourcePath - The source path of an MCP server or other config item
 * @returns Plugin name if from a plugin, null otherwise
 */
export function getPluginNameFromPath(sourcePath: string): string | null {
  const normalized = sourcePath.replace(/\\/g, "/");
  const match = normalized.match(
    /\/plugins\/marketplaces\/[^/]+\/external_plugins\/([^/]+)\//
  );
  return match ? match[1] : null;
}
