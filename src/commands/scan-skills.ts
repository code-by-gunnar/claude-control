import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { extractPlugins } from "../plugins/resolver.js";
import { extractCommands } from "../hooks/resolver.js";
import { scanAllSkills } from "../skills/scanner.js";
import { formatSkillsScan } from "../formatters/index.js";

/**
 * Register the `scan-skills` command on the Commander program.
 *
 * Command: `claude-ctl scan-skills [project-dir]`
 * Scans all skills and commands for potential security issues
 * like prompt injection, data exfiltration, or system compromise.
 *
 * Exit codes:
 * - 0: Clean or low-severity findings only
 * - 1: Medium-severity findings present
 * - 2: High or critical findings present
 *
 * @param program - The Commander.js program instance
 */
export function scanSkillsCommand(program: Command): void {
  program
    .command("scan-skills [project-dir]")
    .description(
      "Scan skills and commands for security issues"
    )
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const pluginsResult = await extractPlugins(result.files);
      const commandsResult = await extractCommands(
        result.files,
        pluginsResult.plugins
      );
      const scanResult = scanAllSkills(commandsResult.commands);

      const output = formatSkillsScan(
        scanResult,
        result.projectDir,
        json
      );
      process.stdout.write(output + "\n");

      // Exit code based on findings severity
      if (scanResult.summary.danger > 0) {
        process.exitCode = 2;
      } else if (scanResult.summary.warning > 0) {
        process.exitCode = 1;
      }
    });
}
