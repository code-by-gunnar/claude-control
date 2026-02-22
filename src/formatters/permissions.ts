import chalk from "chalk";
import os from "node:os";
import path from "node:path";
import type { PermissionsResult } from "../permissions/types.js";

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
 * Get the color function for a permission rule type.
 */
function ruleColor(rule: "allow" | "deny" | "ask"): typeof chalk.green {
  switch (rule) {
    case "allow":
      return chalk.green;
    case "deny":
      return chalk.red;
    case "ask":
      return chalk.yellow;
  }
}

/**
 * Format a tool name with optional pattern for display.
 */
function formatToolLabel(tool: string, pattern?: string): string {
  return pattern ? `${tool}(${pattern})` : tool;
}

/**
 * Format permissions as a human-readable table with override chains.
 *
 * Shows each effective permission's tool, rule, source scope, and file path.
 * When a permission is defined at multiple scopes, the full override chain
 * is displayed to show which rule wins.
 *
 * @param result - The resolved permissions result
 * @param projectDir - The project directory, or null for global-only scans
 */
export function formatPermissionsTable(
  result: PermissionsResult,
  projectDir: string | null
): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Permissions"));
  lines.push(chalk.dim("=".repeat(11)));
  lines.push("");

  if (result.effective.length === 0) {
    lines.push("No permissions configured.");
    return lines.join("\n");
  }

  for (const perm of result.effective) {
    // Tool name (+ pattern) in bold
    const label = formatToolLabel(perm.tool, perm.pattern);
    lines.push(chalk.bold(label));

    // Effective rule with color coding
    const colorFn = ruleColor(perm.effectiveRule);
    lines.push(`  ${colorFn(perm.effectiveRule)}`);

    // Source scope and path in dim
    const displayPath = shortenPath(perm.effectiveSourcePath, projectDir);
    lines.push(
      chalk.dim(`  from ${perm.effectiveScope} (${displayPath})`)
    );

    // Override chain (only when permission exists at multiple scopes)
    if (perm.overrides.length > 1) {
      lines.push(chalk.dim("  Override chain:"));

      for (let i = 0; i < perm.overrides.length; i++) {
        const override = perm.overrides[i];
        const overridePath = shortenPath(override.sourcePath, projectDir);
        const isLast = i === perm.overrides.length - 1;
        const connector = isLast ? "\u2514" : "\u251C";

        if (i === 0) {
          // Winning entry — highlighted in green
          lines.push(
            chalk.green(
              `  ${connector} ${override.scope}: ${override.rule} (${overridePath})`
            )
          );
        } else {
          // Overridden entry — dim
          lines.push(
            chalk.dim(
              `  ${connector} ${override.scope}: ${override.rule} (${overridePath})`
            )
          );
        }
      }
    }

    // Blank line between permissions
    lines.push("");
  }

  // Footer: summary counts
  const allowCount = result.effective.filter(
    (p) => p.effectiveRule === "allow"
  ).length;
  const denyCount = result.effective.filter(
    (p) => p.effectiveRule === "deny"
  ).length;
  const askCount = result.effective.filter(
    (p) => p.effectiveRule === "ask"
  ).length;

  lines.push(
    chalk.dim(
      `${chalk.green(String(allowCount))} allow, ${chalk.red(String(denyCount))} deny, ${chalk.yellow(String(askCount))} ask`
    )
  );

  return lines.join("\n");
}

/**
 * Format permissions result as JSON.
 *
 * @param result - The resolved permissions result
 */
export function formatPermissionsJson(result: PermissionsResult): string {
  return JSON.stringify(result, null, 2);
}
