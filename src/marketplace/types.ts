/**
 * Information about a single marketplace.
 */
export interface MarketplaceInfo {
  /** Marketplace identifier (e.g., "claude-plugins-official") */
  id: string;
  /** Source repository information */
  source: { source: string; repo: string };
  /** Location where plugins are installed */
  installLocation: string;
  /** ISO date of last update */
  lastUpdated: string;
  /** Total plugins in this marketplace */
  pluginCount: number;
  /** All plugins in this marketplace */
  plugins: MarketplacePlugin[];
}

/**
 * A single plugin entry from a marketplace catalog.
 */
export interface MarketplacePlugin {
  /** Plugin name */
  name: string;
  /** Marketplace this plugin belongs to */
  marketplace: string;
  /** Whether it's in plugins/ or external_plugins/ */
  directory: "plugins" | "external_plugins";
  /** Description from .claude-plugin/plugin.json */
  description: string | null;
  /** Whether it's in installed_plugins.json */
  installed: boolean;
  /** Whether it's in enabledPlugins settings */
  enabled: boolean;
  /** Whether it's in blocklist.json */
  blocked: boolean;
  /** Install count from install-counts-cache.json */
  installCount: number | null;
}

/**
 * A single entry in the blocklist.
 */
export interface BlockedPlugin {
  /** Plugin identifier */
  plugin: string;
  /** Reason for blocking */
  reason: string;
}

/**
 * The complete result of marketplace discovery.
 */
export interface MarketplacesResult {
  /** All discovered marketplaces */
  marketplaces: MarketplaceInfo[];
  /** Total plugins across all marketplaces */
  totalPlugins: number;
  /** Plugins in the blocklist */
  blockedPlugins: BlockedPlugin[];
}
