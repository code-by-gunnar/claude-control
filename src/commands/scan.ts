import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { formatScan } from "../formatters/index.js";

/**
 * Register the `scan` command on the Commander program.
 *
 * Command: `claude-ctl scan [project-dir]`
 * Lists all Claude Code config file locations with their scope, type, path, and status.
 *
 * @param program - The Commander.js program instance
 */
export function scanCommand(program: Command): void {
  program
    .command("scan [project-dir]")
    .description(
      "Scan and list all Claude Code configuration file locations"
    )
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const output = formatScan(result, json);

      process.stdout.write(output + "\n");
    });
}
