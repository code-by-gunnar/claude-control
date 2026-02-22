import type { ConfigScope } from "../scanner/types.js";

/**
 * A single installed plugin.
 */
export interface PluginInfo {
  /** Plugin name (e.g., "context7", "frontend-design") */
  name: string;
  /** Marketplace identifier (e.g., "claude-plugins-official") */
  marketplace: string;
  /** Full plugin key as stored in settings (e.g., "context7@claude-plugins-official") */
  key: string;
  /** Whether the plugin is enabled */
  enabled: boolean;
  /** Scope of the settings file that defines this plugin */
  scope: ConfigScope;
  /** Path to the settings file that enables this plugin */
  sourcePath: string;
  /** Path to the plugin directory on disk */
  pluginDir: string;
  /** Whether the plugin directory exists on disk */
  installed: boolean;
  /** MCP server names provided by this plugin */
  mcpServers: string[];
}

/**
 * The complete result of plugin extraction.
 */
export interface PluginsResult {
  /** All discovered plugins */
  plugins: PluginInfo[];
  /** Total number of plugins found in settings */
  totalCount: number;
  /** Number of enabled plugins */
  enabledCount: number;
  /** Number of plugins with a directory on disk */
  installedCount: number;
}
