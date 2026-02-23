import fs from "node:fs/promises";
import path from "node:path";
import type { ConfigFile } from "../scanner/types.js";
import { getGlobalClaudeDir } from "../scanner/paths.js";
import { parseJsonc } from "../scanner/parser.js";
import { readInstalledPluginsRegistry } from "../plugins/resolver.js";
import type {
  MarketplaceInfo,
  MarketplacePlugin,
  BlockedPlugin,
  MarketplacesResult,
} from "./types.js";

/**
 * Shape of known_marketplaces.json.
 */
interface KnownMarketplace {
  source: string;
  repo: string;
  installLocation: string;
  lastUpdated: string;
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
 * Read the plugin manifest (.claude-plugin/plugin.json) description from a directory.
 */
async function readPluginDescription(pluginDir: string): Promise<string | null> {
  const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  try {
    const { data } = await parseJsonc(manifestPath);
    if (data && typeof data === "object") {
      const manifest = data as Record<string, unknown>;
      if (typeof manifest.description === "string") {
        return manifest.description;
      }
    }
  } catch {
    // No manifest
  }
  return null;
}

/**
 * List subdirectories in a directory (non-recursive).
 */
async function listSubdirs(dirPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Read install counts cache file.
 */
async function readInstallCounts(
  globalDir: string,
): Promise<Record<string, number>> {
  const cachePath = path.join(globalDir, "plugins", "install-counts-cache.json");
  try {
    const { data } = await parseJsonc(cachePath);
    if (data && typeof data === "object") {
      return data as Record<string, number>;
    }
  } catch {
    // Cache doesn't exist
  }
  return {};
}

/**
 * Read blocklist.json.
 */
async function readBlocklist(globalDir: string): Promise<BlockedPlugin[]> {
  const blocklistPath = path.join(globalDir, "plugins", "blocklist.json");
  try {
    const { data } = await parseJsonc(blocklistPath);
    if (Array.isArray(data)) {
      return data
        .filter((item) => item && typeof item === "object")
        .map((item) => {
          const entry = item as Record<string, unknown>;
          return {
            plugin: String(entry.plugin ?? entry.name ?? ""),
            reason: String(entry.reason ?? ""),
          };
        });
    }
    // May be an object with plugin names as keys
    if (data && typeof data === "object") {
      return Object.entries(data as Record<string, unknown>).map(([key, val]) => ({
        plugin: key,
        reason: typeof val === "string" ? val : "",
      }));
    }
  } catch {
    // No blocklist
  }
  return [];
}

/**
 * Extract enabled plugin keys from settings files.
 */
function getEnabledPluginKeys(files: ConfigFile[]): Set<string> {
  const enabled = new Set<string>();

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
    if (content.enabledPlugins && typeof content.enabledPlugins === "object") {
      const plugins = content.enabledPlugins as Record<string, boolean>;
      for (const [key, val] of Object.entries(plugins)) {
        if (val) enabled.add(key);
      }
    }
  }

  return enabled;
}

/**
 * Extract all marketplaces and their plugin catalogs.
 *
 * Reads known_marketplaces.json, scans plugin directories, cross-references
 * with installed_plugins.json, settings, blocklist, and install counts.
 *
 * @param files - All scanned configuration files from a scan() call
 * @returns MarketplacesResult with full marketplace catalog
 */
export async function extractMarketplaces(
  files: ConfigFile[],
): Promise<MarketplacesResult> {
  const globalDir = getGlobalClaudeDir();
  const marketplacesDir = path.join(globalDir, "plugins", "marketplaces");

  // Read all supporting data in parallel
  const [registry, installCounts, blocklist, knownMarketplacesData] =
    await Promise.all([
      readInstalledPluginsRegistry(globalDir),
      readInstallCounts(globalDir),
      readBlocklist(globalDir),
      (async () => {
        const kmPath = path.join(globalDir, "plugins", "known_marketplaces.json");
        try {
          const { data } = await parseJsonc(kmPath);
          if (data && typeof data === "object") {
            return data as Record<string, KnownMarketplace>;
          }
        } catch {
          // No known_marketplaces.json
        }
        return {} as Record<string, KnownMarketplace>;
      })(),
    ]);

  const enabledKeys = getEnabledPluginKeys(files);
  const installedKeys = new Set(Object.keys(registry?.plugins ?? {}));
  const blockedNames = new Set(blocklist.map((b) => b.plugin));

  const marketplaces: MarketplaceInfo[] = [];

  for (const [marketplaceId, meta] of Object.entries(knownMarketplacesData)) {
    const marketplaceDir = path.join(marketplacesDir, marketplaceId);
    const plugins: MarketplacePlugin[] = [];

    // Scan both plugins/ and external_plugins/ directories
    for (const subDir of ["plugins", "external_plugins"] as const) {
      const dirPath = path.join(marketplaceDir, subDir);
      if (!(await dirExists(dirPath))) continue;

      const pluginNames = await listSubdirs(dirPath);

      const pluginPromises = pluginNames.map(async (name) => {
        const pluginDir = path.join(dirPath, name);
        const pluginKey = `${name}@${marketplaceId}`;

        const description = await readPluginDescription(pluginDir);

        return {
          name,
          marketplace: marketplaceId,
          directory: subDir,
          description,
          installed: installedKeys.has(pluginKey),
          enabled: enabledKeys.has(pluginKey),
          blocked: blockedNames.has(name) || blockedNames.has(pluginKey),
          installCount: installCounts[pluginKey] ?? installCounts[name] ?? null,
        } satisfies MarketplacePlugin;
      });

      const results = await Promise.all(pluginPromises);
      plugins.push(...results);
    }

    // Sort: enabled first, then installed, then alphabetically
    plugins.sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      if (a.installed !== b.installed) return a.installed ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    marketplaces.push({
      id: marketplaceId,
      source: { source: meta.source, repo: meta.repo },
      installLocation: meta.installLocation,
      lastUpdated: meta.lastUpdated,
      pluginCount: plugins.length,
      plugins,
    });
  }

  const totalPlugins = marketplaces.reduce((sum, m) => sum + m.pluginCount, 0);

  return {
    marketplaces,
    totalPlugins,
    blockedPlugins: blocklist,
  };
}
