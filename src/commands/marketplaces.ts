import type { Command } from "commander";
import { scan } from "../scanner/index.js";
import { extractMarketplaces } from "../marketplace/resolver.js";
import { formatMarketplaces } from "../formatters/index.js";

/**
 * Register the `marketplaces` command on the Commander program.
 *
 * Command: `claude-ctl marketplaces [project-dir]`
 * Lists all plugin marketplaces and their plugin catalogs.
 *
 * @param program - The Commander.js program instance
 */
export function marketplacesCommand(program: Command): void {
  program
    .command("marketplaces [project-dir]")
    .description(
      "List plugin marketplaces and their plugin catalogs"
    )
    .action(async (projectDir?: string) => {
      const dir = projectDir ?? process.cwd();
      const json = program.opts().json === true;

      const result = await scan(dir);
      const marketplacesResult = await extractMarketplaces(result.files);

      const output = formatMarketplaces(marketplacesResult, json);
      process.stdout.write(output + "\n");
    });
}
