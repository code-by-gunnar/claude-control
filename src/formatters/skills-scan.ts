import chalk from "chalk";
import type { SkillScanResult, SkillScanEntry, SkillFinding, FindingSeverity } from "../skills/types.js";

/**
 * Get chalk color function for a severity level.
 */
function severityColor(severity: FindingSeverity): typeof chalk.red {
  switch (severity) {
    case "critical":
      return chalk.red;
    case "high":
      return chalk.redBright;
    case "medium":
      return chalk.yellow;
    case "low":
      return chalk.blue;
  }
}

/**
 * Get a severity badge string with color.
 */
function severityBadge(severity: FindingSeverity): string {
  const color = severityColor(severity);
  return color(severity.toUpperCase().padEnd(8));
}

/**
 * Get a status indicator with color.
 */
function statusIndicator(status: SkillScanEntry["status"]): string {
  switch (status) {
    case "clean":
      return chalk.green("\u2713 clean");
    case "info":
      return chalk.blue("\u2139 info");
    case "warning":
      return chalk.yellow("\u26A0 warning");
    case "danger":
      return chalk.red("\u2718 danger");
  }
}

/**
 * Shorten a path by replacing the home directory with ~.
 */
function shortenPath(fullPath: string, projectDir: string | null): string {
  if (projectDir && fullPath.startsWith(projectDir)) {
    return "." + fullPath.slice(projectDir.length);
  }
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  if (home && fullPath.startsWith(home)) {
    return "~" + fullPath.slice(home.length);
  }
  return fullPath;
}

/**
 * Format skill scan results as a human-readable table.
 */
export function formatSkillsScanTable(
  result: SkillScanResult,
  projectDir: string | null
): string {
  const lines: string[] = [];
  const { summary } = result;

  // Header
  lines.push(chalk.bold("Skill Security Scan"));
  lines.push(chalk.dim("=".repeat(19)));
  lines.push("");

  // Summary
  lines.push(
    `  Scanned: ${chalk.bold(String(summary.total))} skills`
  );
  lines.push(
    `  Clean:   ${chalk.green(String(summary.clean))}`
  );
  if (summary.info > 0) {
    lines.push(`  Info:    ${chalk.blue(String(summary.info))}`);
  }
  if (summary.warning > 0) {
    lines.push(`  Warning: ${chalk.yellow(String(summary.warning))}`);
  }
  if (summary.danger > 0) {
    lines.push(`  Danger:  ${chalk.red(String(summary.danger))}`);
  }
  lines.push("");

  // No findings at all
  if (summary.clean === summary.total) {
    lines.push(chalk.green("No security findings detected. All skills look clean."));
    return lines.join("\n");
  }

  // Entries with findings (danger first, then warning, then info)
  const withFindings = result.entries
    .filter((e) => e.findings.length > 0)
    .sort((a, b) => {
      const order = { danger: 3, warning: 2, info: 1, clean: 0 };
      return order[b.status] - order[a.status];
    });

  lines.push(chalk.bold("Findings"));
  lines.push(chalk.dim("=".repeat(8)));

  for (const entry of withFindings) {
    lines.push("");
    const path = shortenPath(entry.path, projectDir);
    lines.push(
      `  ${statusIndicator(entry.status)} ${chalk.bold(entry.name)} ${chalk.dim(`(${path})`)}`
    );

    for (const finding of entry.findings) {
      const lineInfo = finding.line ? chalk.dim(`:${finding.line}`) : "";
      lines.push(
        `    ${severityBadge(finding.severity)} ${finding.message}${lineInfo}`
      );
      if (finding.snippet) {
        lines.push(
          `             ${chalk.dim(finding.snippet.trim())}`
        );
      }
    }
  }

  return lines.join("\n");
}

/**
 * Format skill scan results as JSON.
 */
export function formatSkillsScanJson(result: SkillScanResult): string {
  return JSON.stringify(result, null, 2);
}
