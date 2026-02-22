import chalk from "chalk";
import type { HealthCategory, HealthResult } from "../health/types.js";

/**
 * Get the color function for a score value.
 * Green for 80+, yellow for 50-79, red for <50.
 */
function scoreColor(score: number): typeof chalk.green {
  if (score >= 80) return chalk.green;
  if (score >= 50) return chalk.yellow;
  return chalk.red;
}

/**
 * Render a score bar using block characters.
 *
 * @param score - Score value 0-100
 * @param width - Total bar width in characters
 */
function renderBar(score: number, width: number): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const colorFn = scoreColor(score);
  return colorFn("\u2588".repeat(filled)) + chalk.dim("\u2591".repeat(empty));
}

/**
 * Format a category line with name, bar, and pass/fail counts.
 */
function formatCategoryLine(category: HealthCategory): string {
  const passed = category.checks.filter((c) => c.passed).length;
  const total = category.checks.length;
  const bar = renderBar(category.score, 20);
  const name = category.name.padEnd(12);
  const colorFn = scoreColor(category.score);
  const scoreStr = colorFn(`${category.score}%`);
  const counts = chalk.dim(`(${passed}/${total} checks)`);

  return `  ${name} ${bar} ${scoreStr} ${counts}`;
}

/**
 * Format health result as a human-readable table with score display,
 * category breakdown, and recommendations.
 *
 * @param result - The health assessment result
 * @param projectDir - The project directory, or null for global-only scans
 */
export function formatHealthTable(
  result: HealthResult,
  projectDir: string | null
): string {
  const lines: string[] = [];

  // Header with big score display
  const colorFn = scoreColor(result.overallScore);
  lines.push(
    chalk.bold(`Health Score: ${colorFn(`${result.overallScore}/100`)} (${colorFn(result.grade)})`)
  );
  lines.push(chalk.dim(result.summary));
  lines.push("");

  // Category breakdown
  lines.push(chalk.bold("Categories"));
  lines.push(chalk.dim("=".repeat(10)));

  for (const category of result.categories) {
    lines.push(formatCategoryLine(category));

    // Show individual check details under each category
    for (const check of category.checks) {
      const icon = check.passed ? chalk.green("\u2713") : chalk.red("\u2717");
      lines.push(`    ${icon} ${check.label}`);
    }
    lines.push("");
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push(chalk.bold("Recommendations"));
    lines.push(chalk.dim("=".repeat(15)));

    for (let i = 0; i < result.recommendations.length; i++) {
      lines.push(chalk.yellow(`  ${i + 1}. ${result.recommendations[i]}`));
    }
  } else {
    lines.push(chalk.green("No recommendations — your setup looks great!"));
  }

  return lines.join("\n");
}

/**
 * Format health result as JSON.
 *
 * @param result - The health assessment result
 */
export function formatHealthJson(result: HealthResult): string {
  return JSON.stringify(result, null, 2);
}
