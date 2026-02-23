import chalk from "chalk";
import os from "node:os";
import type { AgentsResult } from "../agents/types.js";

const homeDir = os.homedir();

/**
 * Format a file size in bytes to a human-readable string.
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Shorten the agents directory path for display.
 */
function shortenDir(dirPath: string): string {
  if (dirPath.startsWith(homeDir)) {
    return "~" + dirPath.slice(homeDir.length).replace(/\\/g, "/");
  }
  return dirPath;
}

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
 * Format agents result as a human-readable table.
 *
 * Shows all custom agent definitions with name, description, tools, model, and size.
 *
 * @param result - The agents extraction result
 */
export function formatAgentsTable(result: AgentsResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold("Custom Agents"));
  lines.push(chalk.dim("=".repeat(13)));
  lines.push("");

  if (result.agents.length === 0) {
    lines.push("No agents found.");
    lines.push(chalk.dim(`Directory: ${shortenDir(result.agentsDir)}`));
    return lines.join("\n");
  }

  // Calculate column widths
  const nameWidth = Math.max(4, ...result.agents.map((a) => a.name.length));
  const descWidth = 40;
  const toolsWidth = 25;
  const modelWidth = Math.max(5, ...result.agents.map((a) => (a.model ?? "—").length));

  // Header row
  lines.push(
    `${pad("Name", nameWidth)}  ${pad("Description", descWidth)}  ${pad("Tools", toolsWidth)}  ${pad("Model", modelWidth)}  Size`
  );
  lines.push(
    chalk.dim(
      `${"\u2500".repeat(nameWidth)}  ${"\u2500".repeat(descWidth)}  ${"\u2500".repeat(toolsWidth)}  ${"\u2500".repeat(modelWidth)}  ${"\u2500".repeat(8)}`
    )
  );

  for (const agent of result.agents) {
    const colorDot = agent.color ? chalk.hex(agent.color)("\u25CF ") : "  ";
    const name = colorDot + agent.name;
    // Adjust padding for the color dot (2 extra chars for the dot+space)
    const namePad = agent.color ? nameWidth + 2 : nameWidth;
    const desc = truncate(agent.description ?? "—", descWidth);
    const tools = truncate(agent.tools.length > 0 ? agent.tools.join(", ") : "—", toolsWidth);
    const model = agent.model ?? "—";
    const size = formatSize(agent.sizeBytes);

    lines.push(
      `${pad(name, namePad)}  ${pad(desc, descWidth)}  ${pad(tools, toolsWidth)}  ${pad(model, modelWidth)}  ${size}`
    );
  }

  lines.push("");
  lines.push(
    chalk.dim(
      `${result.totalCount} agent${result.totalCount === 1 ? "" : "s"} in ${shortenDir(result.agentsDir)}`
    )
  );

  return lines.join("\n");
}

/**
 * Format agents result as JSON.
 *
 * @param result - The agents extraction result
 */
export function formatAgentsJson(result: AgentsResult): string {
  return JSON.stringify(result, null, 2);
}
