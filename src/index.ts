import { Command } from "commander";
import { commandsCommand } from "./commands/commands.js";
import { hooksCommand } from "./commands/hooks.js";
import { mcpCommand } from "./commands/mcp.js";
import { memoryCommand } from "./commands/memory.js";
import { permissionsCommand } from "./commands/permissions.js";
import { scanCommand } from "./commands/scan.js";
import { settingsCommand } from "./commands/settings.js";
import { statusCommand } from "./commands/status.js";

const program = new Command();

program
  .name("claude-ctl")
  .description(
    "Discover, view, and manage Claude Code configuration across all levels"
  )
  .version("0.1.0")
  .option("--json", "Output results as JSON", false);

// Register commands
commandsCommand(program);
hooksCommand(program);
mcpCommand(program);
memoryCommand(program);
permissionsCommand(program);
scanCommand(program);
settingsCommand(program);
statusCommand(program);

program.parse();
