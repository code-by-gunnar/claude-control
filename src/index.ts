import { Command } from "commander";

const program = new Command();

program
  .name("claude-ctl")
  .description(
    "Discover, view, and manage Claude Code configuration across all levels"
  )
  .version("0.1.0");

program.parse();
