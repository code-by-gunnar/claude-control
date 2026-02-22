import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { extractHooks } from "../hooks/resolver.js";
import { formatHooks } from "../formatters/index.js";

/**
 * Register the `hooks` command on the Commander program.
 *
 * Command: `claude-ctl hooks [project-dir]`
 * Shows all configured hooks with event types, matchers, and an event
 * catalog showing which events are configured vs unconfigured.
 *
 * @param program - The Commander.js program instance
 */
export function hooksCommand(program: Command): void {
  program
    .command("hooks [project-dir]")
    .description(
      "Show all configured hooks with event types, matchers, and event catalog"
    )
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const hooksResult = extractHooks(result.files);

      const output = formatHooks(hooksResult, result.projectDir, json);
      process.stdout.write(output + "\n");
    });
}
