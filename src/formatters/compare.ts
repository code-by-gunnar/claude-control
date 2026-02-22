import chalk from "chalk";
import type { ComparisonResult } from "../workspace/types.js";
import type { WorkspaceScan } from "../workspace/types.js";

/**
 * Truncate a value to a max length for table display.
 */
function truncate(value: string, maxLen: number): string {
  if (value.length <= maxLen) return value;
  return value.slice(0, maxLen - 1) + "\u2026";
}

/**
 * Format a value for table display.
 */
function formatValue(value: unknown): string {
  if (value === undefined) return chalk.dim("-");
  if (value === true) return chalk.green("\u2713");
  if (value === false) return chalk.red("\u2717");
  if (typeof value === "string") return truncate(value, 30);
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && value !== null) {
    return truncate(JSON.stringify(value), 30);
  }
  return String(value);
}

/**
 * Format workspace discovery results as a human-readable table.
 *
 * Shows each discovered project with checkmarks for CLAUDE.md, .claude/, and .mcp.json.
 *
 * @param result - The workspace scan result
 * @param json - If true, output JSON; otherwise human-readable table
 */
export function formatDiscovery(result: WorkspaceScan, json: boolean): string {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];

  lines.push(chalk.bold("Projects"));
  lines.push(chalk.dim("=".repeat(8)));
  lines.push("");

  if (result.projects.length === 0) {
    lines.push("No Claude Code projects found.");
    lines.push(chalk.dim(`Scanned: ${result.parentDir}`));
    return lines.join("\n");
  }

  // Header
  const nameWidth = Math.max(
    7,
    ...result.projects.map((p) => p.name.length)
  );
  const header = [
    chalk.dim(pad("Project", nameWidth)),
    chalk.dim(pad(".claude/", 10)),
    chalk.dim(pad("CLAUDE.md", 11)),
    chalk.dim(pad(".mcp.json", 11)),
    chalk.dim(pad("Files", 5)),
  ].join("  ");
  lines.push(header);
  lines.push(chalk.dim("-".repeat(nameWidth + 10 + 11 + 11 + 5 + 8)));

  for (const project of result.projects) {
    const row = [
      chalk.bold(pad(project.name, nameWidth)),
      pad(project.hasClaudeDir ? chalk.green("\u2713") : chalk.dim("-"), 10),
      pad(project.hasClaudeMd ? chalk.green("\u2713") : chalk.dim("-"), 11),
      pad(project.hasMcpJson ? chalk.green("\u2713") : chalk.dim("-"), 11),
      pad(String(project.configFileCount), 5),
    ].join("  ");
    lines.push(row);
  }

  lines.push("");
  lines.push(
    chalk.dim(
      `${result.totalProjects} projects found, ${result.configuredProjects} with config`
    )
  );

  return lines.join("\n");
}

/**
 * Format cross-project comparison results as a human-readable table.
 *
 * Groups entries by type (Settings, MCP, Hooks, Permissions, Memory)
 * and shows a column per project.
 *
 * @param result - The comparison result
 * @param json - If true, output JSON; otherwise human-readable table
 */
export function formatCompare(result: ComparisonResult, json: boolean): string {
  if (json) {
    return JSON.stringify(result, null, 2);
  }

  const lines: string[] = [];

  lines.push(chalk.bold("Comparison"));
  lines.push(chalk.dim("=".repeat(10)));
  lines.push("");

  if (result.entries.length === 0) {
    lines.push("No configuration entries to compare.");
    return lines.join("\n");
  }

  // Column widths (clamped to reasonable maximums)
  const keyWidth = Math.min(
    40,
    Math.max(10, ...result.entries.map((e) => e.key.length))
  );
  const colWidth = Math.min(
    25,
    Math.max(10, ...result.projects.map((p) => p.length))
  );

  // Group entries by type
  const groups: Record<string, typeof result.entries> = {};
  for (const entry of result.entries) {
    const group = entry.type.charAt(0).toUpperCase() + entry.type.slice(1) + "s";
    if (!groups[group]) groups[group] = [];
    groups[group].push(entry);
  }

  const typeOrder = ["Settings", "Mcps", "Hooks", "Permissions", "Memorys"];
  const typeLabels: Record<string, string> = {
    Settings: "Settings",
    Mcps: "MCP Servers",
    Hooks: "Hooks",
    Permissions: "Permissions",
    Memorys: "Memory",
  };

  for (const typeKey of typeOrder) {
    const groupEntries = groups[typeKey];
    if (!groupEntries || groupEntries.length === 0) continue;

    const label = typeLabels[typeKey] ?? typeKey;
    lines.push(chalk.bold.cyan(label));

    // Header row: Key + project names
    const headerCols = [
      chalk.dim(pad("Key", keyWidth)),
      ...result.projects.map((p) => chalk.dim(pad(p, colWidth))),
    ];
    lines.push(headerCols.join("  "));
    lines.push(chalk.dim("-".repeat(keyWidth + (colWidth + 2) * result.projects.length)));

    for (const entry of groupEntries) {
      // Determine if this entry has differences
      const presentProjects = result.projects.filter(
        (name) => entry.values[name] !== undefined
      );
      const valueStrs = presentProjects.map((name) =>
        JSON.stringify(entry.values[name])
      );
      const allSame =
        new Set(valueStrs).size <= 1 &&
        presentProjects.length === result.projects.length;

      const keyDisplay = truncate(entry.key, keyWidth);
      const keyStr = allSame ? pad(keyDisplay, keyWidth) : chalk.yellow(pad(keyDisplay, keyWidth));
      const valueCols = result.projects.map((name) =>
        pad(formatValue(entry.values[name]), colWidth)
      );

      lines.push([keyStr, ...valueCols].join("  "));
    }

    lines.push("");
  }

  // Summary
  lines.push(chalk.bold("Summary"));
  lines.push(
    `  ${chalk.yellow(String(result.summary.totalDifferences))} differences across ${result.entries.length} total entries`
  );

  const uniqueEntries = Object.entries(result.summary.uniqueToProject)
    .filter(([, count]) => count > 0);
  if (uniqueEntries.length > 0) {
    lines.push("  Unique to project:");
    for (const [name, count] of uniqueEntries) {
      lines.push(`    ${chalk.bold(name)}: ${count} items`);
    }
  }

  return lines.join("\n");
}

/**
 * Pad a string to a fixed width.
 */
function pad(str: string, width: number): string {
  return str.padEnd(width);
}
