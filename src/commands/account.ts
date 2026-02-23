import type { Command } from "commander";
import { extractAccountInfo } from "../account/resolver.js";
import { formatAccount } from "../formatters/index.js";

/**
 * Register the `account` command on the Commander program.
 *
 * Command: `claude-ctl account`
 * Shows subscription and rate limit information from credentials.
 *
 * @param program - The Commander.js program instance
 */
export function accountCommand(program: Command): void {
  program
    .command("account")
    .description(
      "Show subscription type and rate limit tier"
    )
    .action(async () => {
      const json = program.opts().json === true;

      const result = await extractAccountInfo();

      const output = formatAccount(result, json);
      process.stdout.write(output + "\n");
    });
}
