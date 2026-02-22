import fs from "node:fs";
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
export function startServer(options: ServerOptions) {
  const { port, projectDir, dashboardDir } = options;

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
