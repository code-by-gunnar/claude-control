import { Command } from "commander";
import { accountCommand } from "./commands/account.js";
import { agentsCommand } from "./commands/agents.js";
import { commandsCommand } from "./commands/commands.js";
import { compareCommand } from "./commands/compare.js";
import { dashboardCommand } from "./commands/dashboard.js";
import { healthCommand } from "./commands/health.js";
import { hooksCommand } from "./commands/hooks.js";
import { marketplacesCommand } from "./commands/marketplaces.js";
import { mcpCommand } from "./commands/mcp.js";
import { memoryCommand } from "./commands/memory.js";
import { permissionsCommand } from "./commands/permissions.js";
import { pluginsCommand } from "./commands/plugins.js";
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
accountCommand(program);
agentsCommand(program);
commandsCommand(program);
compareCommand(program);
dashboardCommand(program);
healthCommand(program);
hooksCommand(program);
marketplacesCommand(program);
mcpCommand(program);
memoryCommand(program);
permissionsCommand(program);
pluginsCommand(program);
scanCommand(program);
settingsCommand(program);
statusCommand(program);

program.parse();
