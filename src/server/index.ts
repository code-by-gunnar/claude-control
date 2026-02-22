import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { apiRoutes, setProjectDir } from "./routes.js";

/**
 * Options for starting the dashboard server.
 */
export interface ServerOptions {
  /** Port to listen on */
  port: number;
  /** Absolute path to the project being inspected */
  projectDir: string;
  /** Absolute path to the dashboard static files directory */
  dashboardDir: string;
}

/**
 * Start the dashboard HTTP server.
 *
 * Sets up the Hono app with:
 * - CORS middleware for development flexibility
 * - REST API routes at /api/*
 * - Static file serving for the React dashboard SPA
 * - SPA fallback (non-API GET requests return index.html)
 *
 * @param options - Server configuration
 * @returns The Node.js HTTP server instance for graceful shutdown
 */
/**
 * Check if a port is already in use.
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once("error", (err: NodeJS.ErrnoException) => {
        resolve(err.code === "EADDRINUSE");
      })
      .once("listening", () => {
        tester.close(() => resolve(false));
      })
      .listen(port);
  });
}

export async function startServer(options: ServerOptions) {
  const { port, projectDir, dashboardDir } = options;

  // Check if port is already in use
  if (await isPortInUse(port)) {
    process.stderr.write(
      `\nError: Port ${port} is already in use.\n` +
      `A previous dashboard instance may still be running.\n` +
      `Stop it first or use a different port with --port <number>.\n\n`
    );
    process.exit(1);
  }

  // Set project directory for API routes
  setProjectDir(projectDir);

  const app = new Hono();

  // CORS middleware for development flexibility
  app.use("*", cors());

  // Mount API routes
  app.route("/", apiRoutes);

  // Pre-read the SPA index.html for fallback (may not exist yet)
  let indexHtml: string | null = null;
  const indexPath = path.join(dashboardDir, "index.html");
  try {
    indexHtml = fs.readFileSync(indexPath, "utf-8");
  } catch {
    // Dashboard not built yet — fallback will return 404 info
  }

  // Static file serving for dashboard assets
  app.use(
    "/*",
    serveStatic({
      root: dashboardDir,
      rewriteRequestPath: (p) => p,
    })
  );

  // SPA fallback: non-API GET requests that didn't match a static file
  app.get("*", (c) => {
    if (indexHtml) {
      return c.html(indexHtml);
    }
    return c.json(
      {
        error: "Dashboard not built",
        message:
          "The dashboard UI has not been built yet. API endpoints are available at /api/*.",
      },
      404
    );
  });

  // Start the server
  const server = serve({
    fetch: app.fetch,
    port,
  });

  return server;
}
