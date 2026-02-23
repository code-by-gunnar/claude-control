import type { Command } from "commander";
import { extractAgents } from "../agents/resolver.js";
import { formatAgents } from "../formatters/index.js";

/**
 * Register the `agents` command on the Commander program.
 *
 * Command: `claude-ctl agents`
 * Lists all custom agent definitions from ~/.claude/agents/.
 *
 * @param program - The Commander.js program instance
 */
export function agentsCommand(program: Command): void {
  program
    .command("agents")
    .description(
      "List custom agent definitions from ~/.claude/agents/"
    )
    .action(async () => {
      const json = program.opts().json === true;

      const result = await extractAgents();

      const output = formatAgents(result, json);
      process.stdout.write(output + "\n");
    });
}
