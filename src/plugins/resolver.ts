import fs from "node:fs/promises";
import path from "node:path";
import type { ConfigFile } from "../scanner/types.js";
import { getGlobalClaudeDir } from "../scanner/paths.js";
import { parseJsonc } from "../scanner/parser.js";
import type { PluginInfo, PluginsResult } from "./types.js";

/**
 * Shape of a single entry in installed_plugins.json (version 2).
 */
export interface InstalledPluginEntry {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha?: string;
}

/**
 * Shape of installed_plugins.json (version 2).
 */
export interface InstalledPluginsRegistry {
  version: number;
  plugins: Record<string, InstalledPluginEntry[]>;
}

/**
 * Shape of .claude-plugin/plugin.json manifest.
 */
interface PluginManifest {
  name?: string;
  description?: string;
  version?: string;
  author?: { name?: string; email?: string };
}

/**
 * Read the installed_plugins.json registry file.
 * Returns the parsed registry or null if it doesn't exist or can't be read.
 */
export async function readInstalledPluginsRegistry(
  globalDir: string,
): Promise<InstalledPluginsRegistry | null> {
  const registryPath = path.join(globalDir, "plugins", "installed_plugins.json");
  try {
    const { data } = await parseJsonc(registryPath);
    if (
      data &&
      typeof data === "object" &&
      (data as Record<string, unknown>).version === 2 &&
      (data as Record<string, unknown>).plugins &&
      typeof (data as Record<string, unknown>).plugins === "object"
    ) {
      return data as InstalledPluginsRegistry;
    }
  } catch {
    // Registry doesn't exist or can't be read
  }
  return null;
}

/**
 * Check if a directory exists on disk.
 */
async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read the plugin manifest (.claude-plugin/plugin.json) from a directory.
 */
async function readPluginManifest(
  pluginDir: string,
): Promise<PluginManifest | null> {
  const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  try {
    const { data } = await parseJsonc(manifestPath);
    if (data && typeof data === "object") {
      return data as PluginManifest;
    }
  } catch {
    // No manifest
  }
  return null;
}

/**
 * Check if a file exists on disk.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determine plugin type by checking for .mcp.json and agents/commands directories.
 */
async function determinePluginType(
  pluginDir: string,
): Promise<"mcp" | "skills" | "hybrid"> {
  const [hasMcp, hasAgents, hasCommands, hasSkills] = await Promise.all([
    fileExists(path.join(pluginDir, ".mcp.json")),
    dirExists(path.join(pluginDir, "agents")),
    dirExists(path.join(pluginDir, "commands")),
    dirExists(path.join(pluginDir, "skills")),
  ]);

  const isSkills = hasAgents || hasCommands || hasSkills;

  if (hasMcp && isSkills) return "hybrid";
  if (hasMcp) return "mcp";
  return "skills";
}

/**
 * Read MCP server names from a plugin directory's .mcp.json file.
 */
async function readMcpServers(pluginDir: string): Promise<string[]> {
  const mcpPath = path.join(pluginDir, ".mcp.json");
  const mcpServers: string[] = [];
  try {
    const { data } = await parseJsonc(mcpPath);
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
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
    // No .mcp.json or unreadable
  }
  return mcpServers;
}

/**
 * Extract all plugins from scanned configuration files.
 *
 * Reads `enabledPlugins` from settings.json files, consults the
 * installed_plugins.json registry, resolves plugin directory paths
 * (checking both external_plugins/ and plugins/ directories),
 * checks installation status, and discovers metadata + MCP servers.
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

  // Read the authoritative install registry once
  const registry = await readInstalledPluginsRegistry(globalDir);

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

        // Look up registry entry for version/install metadata
        const registryEntries = registry?.plugins[pluginKey] ?? [];
        const registryEntry = registryEntries[0] ?? null;

        // Determine install path — registry is authoritative, fall back to directory scan
        let resolvedDir: string | null = null;
        let installPath: string | null = null;
        let installed = false;

        // 1. Check registry installPath first (authoritative)
        if (registryEntry?.installPath) {
          installPath = registryEntry.installPath;
          if (await dirExists(installPath)) {
            resolvedDir = installPath;
            installed = true;
          }
        }

        // 2. Fallback: check external_plugins/{name}/
        if (!installed) {
          const externalDir = path.join(
            globalDir, "plugins", "marketplaces", marketplace,
            "external_plugins", name,
          );
          if (await dirExists(externalDir)) {
            resolvedDir = externalDir;
            installed = true;
          }
        }

        // 3. Fallback: check plugins/{name}/
        if (!installed) {
          const pluginsDir = path.join(
            globalDir, "plugins", "marketplaces", marketplace,
            "plugins", name,
          );
          if (await dirExists(pluginsDir)) {
            resolvedDir = pluginsDir;
            installed = true;
          }
        }

        // Use the resolved directory or default to external_plugins path for display
        const pluginDir = resolvedDir ?? path.join(
          globalDir, "plugins", "marketplaces", marketplace,
          "external_plugins", name,
        );

        // Read metadata from the plugin directory
        let mcpServers: string[] = [];
        let pluginType: "mcp" | "skills" | "hybrid" = "skills";
        let description: string | null = null;

        if (installed && resolvedDir) {
          const [servers, pType, manifest] = await Promise.all([
            readMcpServers(resolvedDir),
            determinePluginType(resolvedDir),
            readPluginManifest(resolvedDir),
          ]);
          mcpServers = servers;
          pluginType = pType;
          description = manifest?.description ?? null;
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
          version: registryEntry?.version ?? null,
          installedAt: registryEntry?.installedAt ?? null,
          lastUpdated: registryEntry?.lastUpdated ?? null,
          pluginType,
          description,
          installPath,
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
  // Match both external_plugins/{name}/ and plugins/{name}/ paths
  const match = normalized.match(
    /\/plugins\/marketplaces\/[^/]+\/(?:external_plugins|plugins)\/([^/]+)\//
  );
  if (match) return match[1];
  // Also match cache paths: cache/{marketplace}/{name}/{version}/
  const cacheMatch = normalized.match(
    /\/plugins\/cache\/[^/]+\/([^/]+)\//
  );
  return cacheMatch ? cacheMatch[1] : null;
}
