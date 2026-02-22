import { Command } from "commander";
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
scanCommand(program);
statusCommand(program);

program.parse();
