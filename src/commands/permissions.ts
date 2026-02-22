import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { resolvePermissions } from "../permissions/resolver.js";
import { formatPermissions } from "../formatters/index.js";

/**
 * Register the `permissions` command on the Commander program.
 *
 * Command: `claude-ctl permissions [project-dir]`
 * Shows merged permissions with deny > ask > allow priority and origin tracking.
 *
 * @param program - The Commander.js program instance
 */
export function permissionsCommand(program: Command): void {
  program
    .command("permissions [project-dir]")
    .description(
      "Show merged permissions with deny > ask > allow priority and origin tracking"
    )
    .option(
      "--tool <name>",
      "Filter to show only permissions matching this tool name (substring match)"
    )
    .action(async (projectDir?: string, options?: { tool?: string }) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);

      // Resolve permissions from all settings files
      let resolved = resolvePermissions(result.files);

      // If --tool provided, filter to matching tools (case-insensitive substring match)
      if (options?.tool) {
        const toolFilter = options.tool.toLowerCase();
        resolved = {
          all: resolved.all.filter((entry) =>
            entry.tool.toLowerCase().includes(toolFilter)
          ),
          effective: resolved.effective.filter((perm) =>
            perm.tool.toLowerCase().includes(toolFilter)
          ),
        };
      }

      const output = formatPermissions(resolved, result.projectDir, json);
      process.stdout.write(output + "\n");
    });
}
