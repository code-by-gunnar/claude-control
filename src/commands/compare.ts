import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { discoverProjects } from "../workspace/discovery.js";
import { compareProjects } from "../workspace/comparison.js";
import { formatDiscovery, formatCompare } from "../formatters/index.js";

/**
 * Check if a path is a directory.
 */
async function isDirectory(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Register the `compare` command on the Commander program.
 *
 * Command: `claude-ctl compare <paths...>`
 *
 * Modes:
 * - Single directory + --discover: list all Claude Code projects found
 * - Single directory (without --discover): discover projects, then compare all
 * - Multiple directories: compare them directly
 *
 * @param program - The Commander.js program instance
 */
export function compareCommand(program: Command): void {
  program
    .command("compare <paths...>")
    .description(
      "Discover Claude Code projects in a parent directory or compare specific projects"
    )
    .option("--discover", "Only discover projects (do not compare)")
    .action(async (paths: string[], options: { discover?: boolean }) => {
      const json = program.opts().json === true;

      // Resolve all paths to absolute
      const resolvedPaths = paths.map((p) => path.resolve(p));

      // Validate all paths exist and are directories
      for (const p of resolvedPaths) {
        if (!(await isDirectory(p))) {
          process.stderr.write(`Error: Not a directory: ${p}\n`);
          process.exit(1);
        }
      }

      if (resolvedPaths.length === 1) {
        // Single directory: discovery mode
        const parentDir = resolvedPaths[0];
        const discovered = await discoverProjects(parentDir);

        if (options.discover) {
          // Just list discovered projects
          const output = formatDiscovery(discovered, json);
          process.stdout.write(output + "\n");
          return;
        }

        // Auto-compare all discovered projects
        if (discovered.projects.length === 0) {
          process.stderr.write(
            `No Claude Code projects found under: ${parentDir}\n`
          );
          process.exit(1);
        }

        if (discovered.projects.length === 1) {
          process.stderr.write(
            `Only 1 project found — need at least 2 to compare.\n`
          );
          process.stderr.write(
            `Use --discover to list projects, or provide multiple paths.\n`
          );
          process.exit(1);
        }

        const projectPaths = discovered.projects.map((p) => p.path);
        const result = await compareProjects(projectPaths);
        const output = formatCompare(result, json);
        process.stdout.write(output + "\n");
      } else {
        // Multiple directories: compare them directly
        const result = await compareProjects(resolvedPaths);
        const output = formatCompare(result, json);
        process.stdout.write(output + "\n");
      }
    });
}
