import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { extractPlugins } from "../plugins/resolver.js";
import { formatPlugins } from "../formatters/index.js";

/**
 * Register the `plugins` command on the Commander program.
 *
 * Command: `claude-ctl plugins [project-dir]`
 * Lists all installed plugins with enabled/disabled status, type, and MCP servers.
 *
 * @param program - The Commander.js program instance
 */
export function pluginsCommand(program: Command): void {
  program
    .command("plugins [project-dir]")
    .description(
      "List installed plugins with status, type, and MCP servers"
    )
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const pluginsResult = await extractPlugins(result.files);

      const output = formatPlugins(pluginsResult, json);
      process.stdout.write(output + "\n");
    });
}
