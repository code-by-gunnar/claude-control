import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import { scanSkillsCommand } from "./commands/scan-skills.js";
import { settingsCommand } from "./commands/settings.js";
import { statusCommand } from "./commands/status.js";

// Read version from package.json by walking up from the bundled entry point.
let cliVersion = "0.0.0";
let searchDir = path.dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 5; i++) {
  const candidate = path.join(searchDir, "package.json");
  if (fs.existsSync(candidate)) {
    const pkg = JSON.parse(fs.readFileSync(candidate, "utf-8")) as { version?: string };
    if (pkg.version) {
      cliVersion = pkg.version;
      break;
    }
  }
  searchDir = path.dirname(searchDir);
}

const program = new Command();

program
  .name("claude-ctl")
  .description(
    "Discover, view, and manage Claude Code configuration across all levels"
  )
  .version(cliVersion)
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
scanSkillsCommand(program);
settingsCommand(program);
statusCommand(program);

program.parse();
