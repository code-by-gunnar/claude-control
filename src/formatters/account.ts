import chalk from "chalk";
import type { AccountInfo } from "../account/resolver.js";

/**
 * Format account info as a human-readable display.
 *
 * Shows subscription type and rate limit tier.
 *
 * @param result - The account info
 */
export function formatAccountTable(result: AccountInfo): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Account"));
  lines.push(chalk.dim("=".repeat(7)));
  lines.push("");

  if (!result.subscriptionType && !result.rateLimitTier) {
    lines.push("Not signed in or credentials unavailable.");
    return lines.join("\n");
  }

  const sub = result.subscriptionType ?? "unknown";
  const tier = result.rateLimitTier ?? "unknown";

  lines.push(`  Subscription:   ${chalk.cyan(sub)}`);
  lines.push(`  Rate limit:     ${chalk.cyan(tier)}`);

  return lines.join("\n");
}

/**
 * Format account info as JSON.
 *
 * @param result - The account info
 */
export function formatAccountJson(result: AccountInfo): string {
  return JSON.stringify(result, null, 2);
}
