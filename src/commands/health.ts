import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { computeHealth } from "../health/resolver.js";
import { formatHealth } from "../formatters/index.js";

/**
 * Register the `health` command on the Commander program.
 *
 * Command: `claude-ctl health [project-dir]`
 * Evaluates project configuration completeness and shows a health score
 * with category breakdowns and actionable recommendations.
 *
 * @param program - The Commander.js program instance
 */
export function healthCommand(program: Command): void {
  program
    .command("health [project-dir]")
    .description(
      "Show configuration health score with recommendations"
    )
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const health = computeHealth(result);
      const output = formatHealth(health, result.projectDir, json);
      process.stdout.write(output + "\n");
    });
}
