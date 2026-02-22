import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { formatMemory, formatMemoryContent } from "../formatters/index.js";

/**
 * Register the `memory` command on the Commander program.
 *
 * Command: `claude-ctl memory [project-dir]`
 * Lists all CLAUDE.md memory files with scope and path, and allows
 * previewing the content of a specific file.
 *
 * @param program - The Commander.js program instance
 */
export function memoryCommand(program: Command): void {
  program
    .command("memory [project-dir]")
    .description(
      "List all CLAUDE.md memory files and optionally preview their content"
    )
    .option(
      "--show <path>",
      "Preview content of a specific CLAUDE.md file (path substring or 1-based index)"
    )
    .action(async (projectDir?: string, options?: { show?: string }) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);

      // Filter for claude-md type files that exist
      const memoryFiles = result.files.filter(
        (f) => f.type === "claude-md" && f.exists
      );

      if (options?.show) {
        // Find matching file by 1-based index number or path substring
        const indexNum = parseInt(options.show, 10);
        let target = undefined;

        if (!isNaN(indexNum) && indexNum >= 1 && indexNum <= memoryFiles.length) {
          target = memoryFiles[indexNum - 1];
        } else {
          target = memoryFiles.find((f) =>
            f.expectedPath.includes(options.show!)
          );
        }

        if (!target) {
          const available = memoryFiles
            .map((f, i) => `  ${i + 1}. ${f.expectedPath}`)
            .join("\n");
          const msg = memoryFiles.length > 0
            ? `File not found: "${options.show}"\n\nAvailable CLAUDE.md files:\n${available}`
            : `File not found: "${options.show}"\n\nNo CLAUDE.md files found.`;
          process.stderr.write(msg + "\n");
          process.exitCode = 1;
          return;
        }

        const output = formatMemoryContent(target, json);
        process.stdout.write(output + "\n");
        return;
      }

      // List mode
      const output = formatMemory(memoryFiles, result.projectDir, json);
      process.stdout.write(output + "\n");
    });
}
