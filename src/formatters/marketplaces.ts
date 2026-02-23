import chalk from "chalk";
import type { MarketplacesResult } from "../marketplace/types.js";

/**
 * Pad a string to a fixed width.
 */
function pad(str: string, width: number): string {
  return str.padEnd(width);
}

/**
 * Format a date string for display (just the date portion).
 */
function formatDate(isoDate: string): string {
  try {
    return isoDate.slice(0, 10);
  } catch {
    return isoDate;
  }
}

/**
 * Format marketplaces result as a human-readable table.
 *
 * Shows each marketplace with its plugins, install/enabled status, and blocked warnings.
 *
 * @param result - The marketplaces extraction result
 */
export function formatMarketplacesTable(result: MarketplacesResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Plugin Marketplaces"));
  lines.push(chalk.dim("=".repeat(19)));
  lines.push("");

  if (result.marketplaces.length === 0) {
    lines.push("No marketplaces found.");
    return lines.join("\n");
  }

  for (const marketplace of result.marketplaces) {
    // Marketplace header
    lines.push(chalk.bold.cyan(marketplace.id));
    lines.push(chalk.dim(`  ${marketplace.pluginCount} plugins \u2022 updated ${formatDate(marketplace.lastUpdated)}`));
    lines.push("");

    if (marketplace.plugins.length === 0) {
      lines.push(chalk.dim("  No plugins in this marketplace."));
      lines.push("");
      continue;
    }

    // Calculate column widths for this marketplace
    const nameWidth = Math.max(4, ...marketplace.plugins.map((p) => p.name.length));
    const dirWidth = 8; // "external" or "bundled"

    // Header row
    lines.push(
      `  ${pad("Name", nameWidth)}  ${pad("Type", dirWidth)}  Installed  Enabled`
    );
    lines.push(
      chalk.dim(
        `  ${"\u2500".repeat(nameWidth)}  ${"\u2500".repeat(dirWidth)}  ${"\u2500".repeat(9)}  ${"\u2500".repeat(7)}`
      )
    );

    for (const plugin of marketplace.plugins) {
      const dir = plugin.directory === "external_plugins" ? "external" : "bundled";
      const installed = plugin.installed ? chalk.green("\u2713") : chalk.dim("\u2717");
      const enabled = plugin.enabled ? chalk.green("\u2713") : chalk.dim("\u2717");
      const blocked = plugin.blocked ? chalk.red(" [BLOCKED]") : "";
      const name = plugin.blocked
        ? chalk.red(plugin.name)
        : plugin.enabled
          ? chalk.white(plugin.name)
          : chalk.dim(plugin.name);

      lines.push(
        `  ${pad(plugin.name, nameWidth)}  ${pad(dir, dirWidth)}  ${pad(installed + "        ", 9)}  ${enabled}${blocked}`
      );
    }
    lines.push("");
  }

  // Blocked plugins warning
  if (result.blockedPlugins.length > 0) {
    lines.push(chalk.red.bold("Blocked Plugins"));
    lines.push(chalk.dim("-".repeat(15)));
    for (const blocked of result.blockedPlugins) {
      lines.push(chalk.red(`  ${blocked.plugin}: ${blocked.reason || "no reason given"}`));
    }
    lines.push("");
  }

  lines.push(
    chalk.dim(
      `${result.marketplaces.length} marketplace${result.marketplaces.length === 1 ? "" : "s"}, ${result.totalPlugins} total plugins`
    )
  );

  return lines.join("\n");
}

/**
 * Format marketplaces result as JSON.
 *
 * @param result - The marketplaces extraction result
 */
export function formatMarketplacesJson(result: MarketplacesResult): string {
  return JSON.stringify(result, null, 2);
}
