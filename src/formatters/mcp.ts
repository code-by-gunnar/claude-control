import chalk from "chalk";
import os from "node:os";
import path from "node:path";
import type { McpResult, McpServer } from "../mcp/types.js";

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
 * Build the details string for a server entry.
 */
function getDetails(server: McpServer): string {
  if (server.type === "command") {
    const parts = [server.command ?? ""];
    if (server.args && server.args.length > 0) {
      parts.push(...server.args);
    }
    return parts.join(" ");
  }
  // http type
  return server.url ?? "(no url)";
}

/**
 * Format MCP servers as a human-readable table.
 *
 * Shows all MCP servers with name, type, scope, and details.
 * Includes duplicate warnings and masked secret indicators.
 *
 * @param result - The MCP extraction result
 * @param projectDir - The project directory, or null for global-only scans
 */
export function formatMcpTable(
  result: McpResult,
  projectDir: string | null
): string {
  const lines: string[] = [];

  lines.push(chalk.bold("MCP Servers"));
  lines.push(chalk.dim("=".repeat(11)));
  lines.push("");

  if (result.servers.length === 0) {
    lines.push("No MCP servers configured.");
    return lines.join("\n");
  }

  // Column headers
  const headers = { name: "Name", type: "Type", scope: "Scope", details: "Details" };

  // Calculate column widths
  const nameWidth = Math.max(
    headers.name.length,
    ...result.servers.map((s) => s.name.length)
  );
  const typeWidth = Math.max(
    headers.type.length,
    ...result.servers.map((s) => s.type.length)
  );
  const scopeWidth = Math.max(
    headers.scope.length,
    ...result.servers.map((s) => s.scope.length)
  );

  // Header row
  lines.push(
    `${pad(headers.name, nameWidth)}  ${pad(headers.type, typeWidth)}  ${pad(headers.scope, scopeWidth)}  ${headers.details}`
  );

  // Separator row
  lines.push(
    chalk.dim(
      `${"\u2500".repeat(nameWidth)}  ${"\u2500".repeat(typeWidth)}  ${"\u2500".repeat(scopeWidth)}  ${"\u2500".repeat(30)}`
    )
  );

  // Server rows
  for (const server of result.servers) {
    const details = getDetails(server);

    lines.push(
      `${pad(server.name, nameWidth)}  ${pad(server.type, typeWidth)}  ${pad(server.scope, scopeWidth)}  ${details}`
    );

    // Show masked headers if present
    if (server.headers && Object.keys(server.headers).length > 0) {
      for (const [key, value] of Object.entries(server.headers)) {
        lines.push(
          chalk.dim(`${" ".repeat(nameWidth + 2 + typeWidth + 2 + scopeWidth + 2)}  ${key}: ${value}`)
        );
      }
    }

    // Show env vars if present
    if (server.env && Object.keys(server.env).length > 0) {
      for (const [key, value] of Object.entries(server.env)) {
        lines.push(
          chalk.dim(`${" ".repeat(nameWidth + 2 + typeWidth + 2 + scopeWidth + 2)}  env.${key}: ${value}`)
        );
      }
    }

    // Show source path
    const displayPath = shortenPath(server.sourcePath, projectDir);
    lines.push(
      chalk.dim(`${" ".repeat(nameWidth + 2 + typeWidth + 2 + scopeWidth + 2)}  from ${displayPath}`)
    );
  }

  // Duplicate warnings
  if (result.duplicates.length > 0) {
    lines.push("");
    lines.push(chalk.yellow.bold("\u26A0 Duplicate servers:"));
    for (const dup of result.duplicates) {
      const locations = dup.locations
        .map((l) => `${l.scope} (${shortenPath(l.sourcePath, projectDir)})`)
        .join(", ");
      lines.push(chalk.yellow(`  ${dup.name}: ${locations}`));
    }
  }

  lines.push("");
  lines.push(
    chalk.dim(
      `${result.servers.length} server(s) configured`
    )
  );

  return lines.join("\n");
}

/**
 * Format MCP servers as JSON.
 *
 * Returns the McpResult directly serialized as JSON.
 *
 * @param result - The MCP extraction result
 */
export function formatMcpJson(result: McpResult): string {
  return JSON.stringify(result, null, 2);
}
