import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { formatStatus } from "../formatters/index.js";

/**
 * Register the `status` command on the Commander program.
 *
 * Command: `claude-ctl status [project-dir]`
 * Shows a summary of Claude Code configuration status with counts
 * and a grouped file list.
 *
 * @param program - The Commander.js program instance
 */
export function statusCommand(program: Command): void {
  program
    .command("status [project-dir]")
    .description(
      "Show summary of Claude Code configuration status"
    )
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const output = formatStatus(result, json);

      process.stdout.write(output + "\n");
    });
}
