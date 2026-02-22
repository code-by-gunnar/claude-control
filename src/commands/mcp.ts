import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { extractMcpServers } from "../mcp/resolver.js";
import { formatMcp } from "../formatters/index.js";

/**
 * Register the `mcp` command on the Commander program.
 *
 * Command: `claude-ctl mcp [project-dir]`
 * Lists all configured MCP servers with details, secret masking,
 * and duplicate detection.
 *
 * @param program - The Commander.js program instance
 */
export function mcpCommand(program: Command): void {
  program
    .command("mcp [project-dir]")
    .description(
      "List all configured MCP servers with details and duplicate detection"
    )
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const mcpResult = extractMcpServers(result.files);

      const output = formatMcp(mcpResult, result.projectDir, json);
      process.stdout.write(output + "\n");
    });
}
