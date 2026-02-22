import chalk from "chalk";
import os from "node:os";
import path from "node:path";
import type { CommandsResult } from "../hooks/types.js";
import type { HooksResult } from "../hooks/types.js";

const homeDir = os.homedir();

/**
 * Replace the home directory prefix with ~ for display readability.
 */
function shortenPath(filePath: string, projectDir: string | null): string {
  // For project-scope files, show project-relative path
  if (projectDir && filePath.startsWith(projectDir)) {
    const relative = path.relative(projectDir, filePath);
    return relative || filePath;
  }

  // Replace home directory with ~
  if (filePath.startsWith(homeDir)) {
    return "~" + filePath.slice(homeDir.length).replace(/\\/g, "/");
  }

  return filePath;
}

/**
 * Pad a string to a fixed width.
 */
function pad(str: string, width: number): string {
  return str.padEnd(width);
}

/**
 * Format hooks extraction result as a human-readable table.
 *
 * Shows all configured hooks grouped by event, with matchers and commands,
 * followed by an event catalog showing configured vs unconfigured status.
 *
 * @param result - The hooks extraction result
 * @param projectDir - The project directory, or null for global-only scans
 */
export function formatHooksTable(
  result: HooksResult,
  projectDir: string | null
): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Configured Hooks"));
  lines.push(chalk.dim("=".repeat(16)));
  lines.push("");

  if (result.events.length === 0) {
    lines.push("No hooks configured.");
    lines.push("");
  } else {
    for (const event of result.events) {
      // Event name in bold cyan
      lines.push(chalk.bold.cyan(event.event));

      for (const matcher of event.matchers) {
        const matcherLabel = matcher.matcher ?? "all";
        lines.push(`  matcher: ${matcherLabel}`);

        for (const hook of matcher.hooks) {
          const asyncLabel = hook.async ? " (async)" : "";
          lines.push(`    ${hook.command}${asyncLabel}`);
        }
      }

      // Scope and source path in dim
      const displayPath = shortenPath(event.sourcePath, projectDir);
      lines.push(chalk.dim(`  scope: ${event.scope} (${displayPath})`));
      lines.push("");
    }
  }

  // Event catalog section
  lines.push(chalk.bold("Event Catalog"));
  lines.push(chalk.dim("-".repeat(13)));

  for (const event of result.availableEvents) {
    if (result.configuredEvents.includes(event)) {
      lines.push(chalk.green(`  \u2713 ${event}`));
    } else {
      lines.push(chalk.dim(`  \u2717 ${event}`));
    }
  }

  lines.push("");
  lines.push(
    chalk.dim(
      `${result.configuredEvents.length} configured, ${result.unconfiguredEvents.length} unconfigured (${result.availableEvents.length} total events)`
    )
  );

  return lines.join("\n");
}

/**
 * Format hooks extraction result as JSON.
 *
 * @param result - The hooks extraction result
 */
export function formatHooksJson(result: HooksResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format commands extraction result as a human-readable table.
 *
 * Shows all custom commands and skills with name, scope, and path.
 *
 * @param result - The commands extraction result
 * @param projectDir - The project directory, or null for global-only scans
 */
export function formatCommandsTable(
  result: CommandsResult,
  projectDir: string | null
): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Custom Commands & Skills"));
  lines.push(chalk.dim("=".repeat(23)));
  lines.push("");

  if (result.commands.length === 0) {
    lines.push("No custom commands found.");
    return lines.join("\n");
  }

  // Column headers
  const headers = { name: "Name", scope: "Scope", path: "Path" };

  // Calculate column widths
  const nameWidth = Math.max(
    headers.name.length,
    ...result.commands.map((c) => c.name.length)
  );
  const scopeWidth = Math.max(
    headers.scope.length,
    ...result.commands.map((c) => c.scope.length)
  );

  // Header row
  lines.push(
    `${pad(headers.name, nameWidth)}  ${pad(headers.scope, scopeWidth)}  ${headers.path}`
  );

  // Separator row
  lines.push(
    chalk.dim(
      `${"\u2500".repeat(nameWidth)}  ${"\u2500".repeat(scopeWidth)}  ${"\u2500".repeat(30)}`
    )
  );

  // Command rows
  for (const cmd of result.commands) {
    const displayPath = shortenPath(cmd.path, projectDir);
    lines.push(
      `${pad(cmd.name, nameWidth)}  ${pad(cmd.scope, scopeWidth)}  ${displayPath}`
    );
  }

  lines.push("");
  lines.push(
    chalk.dim(
      `${result.commands.length} command${result.commands.length === 1 ? "" : "s"} found`
    )
  );

  return lines.join("\n");
}

/**
 * Format commands extraction result as JSON.
 *
 * @param result - The commands extraction result
 */
export function formatCommandsJson(result: CommandsResult): string {
  return JSON.stringify(result, null, 2);
}
