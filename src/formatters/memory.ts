import chalk from "chalk";
import os from "node:os";
import path from "node:path";
import type { MemoryImportResult } from "../memory/types.js";

const homeDir = os.homedir();

/**
 * Replace the home directory prefix with ~ for display readability.
 */
function shortenPath(filePath: string, projectDir: string | null): string {
  if (projectDir && filePath.startsWith(projectDir)) {
    const relative = path.relative(projectDir, filePath);
    return relative || filePath;
  }

  if (filePath.startsWith(homeDir)) {
    return "~" + filePath.slice(homeDir.length).replace(/\\/g, "/");
  }

  return filePath;
}

/**
 * Format memory import resolution as a human-readable table.
 *
 * Shows each CLAUDE.md file, its imports (with exists/broken status),
 * chain depth, and any circular import warnings.
 *
 * @param result - The memory import resolution result
 * @param projectDir - The project directory, or null for global-only scans
 */
export function formatMemoryImportsTable(
  result: MemoryImportResult,
  projectDir: string | null
): string {
  const lines: string[] = [];

  lines.push(chalk.bold("CLAUDE.md Import Analysis"));
  lines.push(chalk.dim("=".repeat(24)));
  lines.push("");

  if (result.files.length === 0) {
    lines.push("No CLAUDE.md files found.");
    return lines.join("\n");
  }

  for (const file of result.files) {
    const displayPath = shortenPath(file.path, projectDir);
    const scopeLabel = chalk.cyan(`[${file.scope}]`);
    lines.push(`${scopeLabel} ${chalk.bold(displayPath)}`);

    if (file.imports.length === 0) {
      lines.push(chalk.dim("  No imports"));
    } else {
      for (const imp of file.imports) {
        const status = imp.exists
          ? chalk.green("\u2713")
          : chalk.red("\u2717");
        const importPath = shortenPath(imp.resolvedPath, projectDir);
        lines.push(`  ${status} ${imp.raw} ${chalk.dim("\u2192")} ${importPath}`);
        if (imp.error) {
          lines.push(chalk.red(`    ${imp.error}`));
        }
      }
    }

    if (file.hasCircular) {
      const circPath = file.circularAt
        ? shortenPath(file.circularAt, projectDir)
        : "unknown";
      lines.push(chalk.yellow(`  \u26A0 Circular import detected at: ${circPath}`));
    }

    if (file.importChain.length > 0) {
      lines.push(chalk.dim(`  Chain depth: ${file.importChain.length} file(s)`));
    }

    lines.push("");
  }

  // Summary
  lines.push(chalk.dim("\u2500".repeat(40)));
  lines.push(
    `${result.totalImports} import(s) total, ${result.totalBroken} broken`
  );

  if (result.brokenImports.length > 0) {
    lines.push("");
    lines.push(chalk.red.bold("Broken imports:"));
    for (const broken of result.brokenImports) {
      const from = shortenPath(broken.relativeTo, projectDir);
      lines.push(chalk.red(`  ${broken.raw} in ${from}`));
    }
  }

  return lines.join("\n");
}

/**
 * Format memory import resolution as JSON.
 *
 * @param result - The memory import resolution result
 */
export function formatMemoryImportsJson(result: MemoryImportResult): string {
  return JSON.stringify(result, null, 2);
}
