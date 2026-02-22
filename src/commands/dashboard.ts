import { exec } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import { startServer } from "../server/index.js";

/**
 * Open a URL in the user's default browser using platform-specific commands.
 *
 * @param url - The URL to open
 */
function openBrowser(url: string): void {
  const platform = process.platform;
  let command: string;

  if (platform === "win32") {
    command = `start "" "${url}"`;
  } else if (platform === "darwin") {
    command = `open "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (err) => {
    if (err) {
      process.stderr.write(
        `Could not open browser automatically. Visit: ${url}\n`
      );
    }
  });
}

/**
 * Register the `dashboard` command on the Commander program.
 *
 * Command: `claude-ctl dashboard [project-dir]`
 * Starts a local HTTP server serving the web dashboard with REST API
 * endpoints for all scanner/resolver data.
 *
 * @param program - The Commander.js program instance
 */
export function dashboardCommand(program: Command): void {
  program
    .command("dashboard [project-dir]")
    .description(
      "Start the web dashboard for visual inspection of Claude Code configuration"
    )
    .option("--port <number>", "Port to serve on", "3737")
    .option("--no-open", "Skip auto-opening the browser")
    .action(
      async (
        projectDir?: string,
        options?: { port?: string; open?: boolean }
      ) => {
        const dir = projectDir ? path.resolve(projectDir) : process.cwd();
        const port = parseInt(options?.port ?? "3737", 10);

        // Dashboard static files directory — adjacent to the built CLI entry point
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const dashboardDir = path.join(__dirname, "dashboard");

        const server = await startServer({ port, projectDir: dir, dashboardDir });

        const url = `http://localhost:${port}`;
        process.stderr.write(`Dashboard running at ${url}\n`);
        process.stderr.write(`Inspecting: ${dir}\n`);
        process.stderr.write(`Press Ctrl+C to stop\n`);

        // Open browser unless --no-open
        if (options?.open !== false) {
          openBrowser(url);
        }

        // Graceful shutdown on SIGINT
        const shutdown = () => {
          process.stderr.write("\nDashboard stopped\n");
          (server as ReturnType<typeof startServer>).close();
          process.exit(0);
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
      }
    );
}
