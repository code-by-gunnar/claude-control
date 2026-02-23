import chalk from "chalk";
import type { PluginsResult } from "../plugins/types.js";

/**
 * Pad a string to a fixed width.
 */
function pad(str: string, width: number): string {
  return str.padEnd(width);
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "\u2026";
}

/**
 * Format plugins result as a human-readable table.
 *
 * Shows all plugins with name, type, enabled/disabled status, marketplace, and version.
 *
 * @param result - The plugins extraction result
 */
export function formatPluginsTable(result: PluginsResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Installed Plugins"));
  lines.push(chalk.dim("=".repeat(17)));
  lines.push("");

  if (result.plugins.length === 0) {
    lines.push("No plugins found.");
    return lines.join("\n");
  }

  // Calculate column widths
  const nameWidth = Math.max(4, ...result.plugins.map((p) => p.name.length));
  const typeWidth = 6; // "hybrid" is the longest
  const statusWidth = 8; // "disabled" is the longest
  const marketWidth = Math.max(11, ...result.plugins.map((p) => p.marketplace.length));
  const versionWidth = Math.max(7, ...result.plugins.map((p) => (p.version ?? "—").length));

  // Header row
  lines.push(
    `${pad("Name", nameWidth)}  ${pad("Type", typeWidth)}  ${pad("Status", statusWidth)}  ${pad("Marketplace", marketWidth)}  Version`
  );
  lines.push(
    chalk.dim(
      `${"\u2500".repeat(nameWidth)}  ${"\u2500".repeat(typeWidth)}  ${"\u2500".repeat(statusWidth)}  ${"\u2500".repeat(marketWidth)}  ${"\u2500".repeat(versionWidth)}`
    )
  );

  for (const plugin of result.plugins) {
    const name = plugin.enabled ? chalk.white(plugin.name) : chalk.dim(plugin.name);
    const namePadded = pad(plugin.name, nameWidth);
    const type = pad(plugin.pluginType, typeWidth);
    const status = plugin.enabled
      ? chalk.green(pad("enabled", statusWidth))
      : chalk.dim(pad("disabled", statusWidth));
    const market = pad(plugin.marketplace, marketWidth);
    const version = truncate(plugin.version ?? "—", versionWidth);

    // Apply dim to the whole line if disabled
    const line = `${namePadded}  ${type}  ${status}  ${market}  ${version}`;
    lines.push(plugin.enabled ? line : chalk.dim(line.replace(/\x1b\[[0-9;]*m/g, "")));
  }

  // Show MCP servers for plugins that have them
  const withMcp = result.plugins.filter((p) => p.mcpServers.length > 0);
  if (withMcp.length > 0) {
    lines.push("");
    lines.push(chalk.bold("Plugin MCP Servers"));
    lines.push(chalk.dim("-".repeat(18)));
    for (const plugin of withMcp) {
      lines.push(`  ${plugin.name}: ${plugin.mcpServers.join(", ")}`);
    }
  }

  lines.push("");
  lines.push(
    chalk.dim(
      `${result.enabledCount} enabled, ${result.installedCount} installed, ${result.totalCount} total`
    )
  );

  return lines.join("\n");
}

/**
 * Format plugins result as JSON.
 *
 * @param result - The plugins extraction result
 */
export function formatPluginsJson(result: PluginsResult): string {
  return JSON.stringify(result, null, 2);
}
