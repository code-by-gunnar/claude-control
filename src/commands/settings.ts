import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import type { ScopedSettings } from "../settings/types.js";
import { resolveSettings } from "../settings/resolver.js";
import { formatSettings } from "../formatters/index.js";

/**
 * Register the `settings` command on the Commander program.
 *
 * Command: `claude-ctl settings [project-dir]`
 * Shows all Claude Code settings with their effective values,
 * source scope, and override chain.
 *
 * @param program - The Commander.js program instance
 */
export function settingsCommand(program: Command): void {
  program
    .command("settings [project-dir]")
    .description(
      "Show all Claude Code settings with scope source and override chain"
    )
    .option(
      "--key <name>",
      "Filter to show only settings matching this key (substring match)"
    )
    .action(async (projectDir?: string, options?: { key?: string }) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);

      // Filter for settings files that exist and have content
      const settingsFiles = result.files.filter(
        (f) =>
          f.type === "settings" &&
          f.exists &&
          f.content !== undefined &&
          f.content !== null &&
          typeof f.content === "object"
      );

      // Map each settings ConfigFile to ScopedSettings
      const scopedSettings: ScopedSettings[] = settingsFiles.map((f) => ({
        scope: f.scope,
        path: f.expectedPath,
        settings: f.content as Record<string, unknown>,
      }));

      // Resolve merged settings with override chain
      let resolved = resolveSettings(scopedSettings);

      // If --key provided, filter to matching keys (substring match)
      if (options?.key) {
        const keyFilter = options.key.toLowerCase();
        resolved = {
          settings: resolved.settings.filter((s) =>
            s.key.toLowerCase().includes(keyFilter)
          ),
        };
      }

      const output = formatSettings(resolved, result.projectDir, json);
      process.stdout.write(output + "\n");
    });
}
