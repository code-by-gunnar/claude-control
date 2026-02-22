import chalk from "chalk";
import os from "node:os";
import path from "node:path";
import type { ConfigFile, ScanResult } from "../scanner/types.js";

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
 * Get the status icon and label for a config file.
 */
function getStatus(file: ConfigFile): { icon: string; label: string; colorFn: typeof chalk.green } {
  if (!file.exists) {
    return { icon: "\u2717", label: "Missing", colorFn: chalk.red };
  }
  if (file.error) {
    return { icon: "\u26A0", label: "Error", colorFn: chalk.yellow };
  }
  return { icon: "\u2713", label: "Found", colorFn: chalk.green };
}

/**
 * Pad a string to a fixed width.
 */
function pad(str: string, width: number): string {
  return str.padEnd(width);
}

/**
 * Format a full scan result as a human-readable table.
 *
 * Shows all config file locations with scope, type, path, and status.
 * Colors are applied via chalk (auto-disabled when stdout is not a TTY).
 */
export function formatScanTable(result: ScanResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Claude Code Configuration Files"));
  lines.push(chalk.dim("=".repeat(34)));
  lines.push("");

  if (result.projectDir) {
    lines.push(`Project: ${chalk.cyan(result.projectDir)}`);
    lines.push("");
  }

  // Column headers
  const headers = {
    scope: "Scope",
    type: "Type",
    path: "Path",
    status: "Status",
  };

  // Calculate column widths
  const scopeWidth = Math.max(
    headers.scope.length,
    ...result.files.map((f) => f.scope.length)
  );
  const typeWidth = Math.max(
    headers.type.length,
    ...result.files.map((f) => f.type.length)
  );
  const pathWidth = Math.max(
    headers.path.length,
    ...result.files.map((f) => shortenPath(f.expectedPath, result.projectDir).length)
  );

  // Header row
  lines.push(
    `${pad(headers.scope, scopeWidth)}  ${pad(headers.type, typeWidth)}  ${pad(headers.path, pathWidth)}  ${headers.status}`
  );

  // Separator row
  lines.push(
    chalk.dim(
      `${"\u2500".repeat(scopeWidth)}  ${"\u2500".repeat(typeWidth)}  ${"\u2500".repeat(pathWidth)}  ${"─".repeat(10)}`
    )
  );

  // File rows
  for (const file of result.files) {
    const status = getStatus(file);
    const displayPath = shortenPath(file.expectedPath, result.projectDir);
    const statusText = status.colorFn(`${status.icon} ${status.label}`);

    lines.push(
      `${pad(file.scope, scopeWidth)}  ${pad(file.type, typeWidth)}  ${pad(displayPath, pathWidth)}  ${statusText}`
    );
  }

  lines.push("");
  lines.push(
    chalk.dim(
      `${result.summary.found} found, ${result.summary.missing} missing, ${result.summary.errors} errors (${result.summary.total} total)`
    )
  );

  return lines.join("\n");
}

/**
 * Get a human-readable label for a config file type.
 */
function getFileLabel(file: ConfigFile): string {
  const labels: Record<string, string> = {
    settings: "settings",
    "claude-md": "instructions",
    "commands-dir": "commands",
    mcp: "MCP config",
    hooks: "hooks config",
    credentials: "credentials",
    keybindings: "keybindings",
  };
  return labels[file.type] ?? file.type;
}

/**
 * Get the reason string for a missing or errored file.
 */
function getReason(file: ConfigFile): string {
  if (!file.exists) return "not configured";
  if (file.error) return file.error;
  return "";
}

/**
 * Format a status summary as a human-readable table.
 *
 * Shows summary counts at top, then a list of files grouped by status.
 */
export function formatStatusTable(result: ScanResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Claude Code Configuration Status"));
  lines.push(chalk.dim("=".repeat(35)));
  lines.push("");

  if (result.projectDir) {
    lines.push(`Project: ${chalk.cyan(result.projectDir)}`);
    lines.push("");
  }

  // Summary counts
  lines.push(
    `Found: ${chalk.green(String(result.summary.found))} of ${result.summary.total} config files`
  );
  if (result.summary.missing > 0) {
    lines.push(`Missing: ${chalk.red(String(result.summary.missing))} files`);
  }
  if (result.summary.errors > 0) {
    lines.push(`Errors: ${chalk.yellow(String(result.summary.errors))} files`);
  }
  lines.push("");

  // Determine max label width for alignment
  const maxLabelWidth = Math.max(
    ...result.files.map((f) => {
      const scopeLabel = f.scope.charAt(0).toUpperCase() + f.scope.slice(1);
      return `${scopeLabel} ${getFileLabel(f)}`.length;
    })
  );

  // File list with status icons
  for (const file of result.files) {
    const status = getStatus(file);
    const scopeLabel = file.scope.charAt(0).toUpperCase() + file.scope.slice(1);
    const label = `${scopeLabel} ${getFileLabel(file)}`;
    const displayPath = shortenPath(file.expectedPath, result.projectDir);
    const reason = getReason(file);

    const icon = status.colorFn(status.icon);
    const reasonSuffix = reason ? chalk.dim(` (${reason})`) : "";

    lines.push(
      `${icon} ${pad(label, maxLabelWidth)}  ${displayPath}${reasonSuffix}`
    );
  }

  return lines.join("\n");
}
