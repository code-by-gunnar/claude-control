import { Command } from "commander";
import { memoryCommand } from "./commands/memory.js";
import { scanCommand } from "./commands/scan.js";
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
memoryCommand(program);
scanCommand(program);
statusCommand(program);

program.parse();
