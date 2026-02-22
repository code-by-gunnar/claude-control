import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { extractCommands } from "../hooks/resolver.js";
import { formatCommands } from "../formatters/index.js";

/**
 * Register the `commands` command on the Commander program.
 *
 * Command: `claude-ctl commands [project-dir]`
 * Lists all custom slash commands and skills from user and project
 * commands directories.
 *
 * @param program - The Commander.js program instance
 */
export function commandsCommand(program: Command): void {
  program
    .command("commands [project-dir]")
    .description("List all custom slash commands and skills")
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const commandsResult = await extractCommands(result.files);

      const output = formatCommands(commandsResult, result.projectDir, json);
      process.stdout.write(output + "\n");
    });
}
