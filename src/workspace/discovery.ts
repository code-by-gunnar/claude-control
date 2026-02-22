import fs from "node:fs/promises";
import path from "node:path";
import type { ProjectInfo, WorkspaceScan } from "./types.js";

/**
 * Directories to skip during project discovery.
 * Hidden directories (starting with .) and common non-project directories.
 */
const SKIP_DIRS = new Set([
  "node_modules",
  "__pycache__",
  ".git",
  ".hg",
  ".svn",
]);

/**
 * Check whether a path exists on disk.
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Count how many Claude Code config files exist in a project directory.
 *
 * Checks for common config locations without running a full scan
 * (which would be too slow for many projects).
 */
async function countConfigFiles(projectPath: string): Promise<number> {
  const candidates = [
    path.join(projectPath, ".claude", "settings.json"),
    path.join(projectPath, ".claude", "settings.local.json"),
    path.join(projectPath, "CLAUDE.md"),
    path.join(projectPath, ".claude", "CLAUDE.md"),
    path.join(projectPath, ".mcp.json"),
    path.join(projectPath, ".claude", "commands"),
  ];

  const checks = await Promise.all(candidates.map(pathExists));
  return checks.filter(Boolean).length;
}

/**
 * Discover Claude Code projects under a parent directory.
 *
 * Scans the immediate children of parentDir for directories that have
 * at least one Claude Code indicator (.claude/ directory, CLAUDE.md, or .mcp.json).
 * This is a lightweight check -- it does NOT run a full scan() for each project.
 *
 * @param parentDir - Absolute path to the parent directory to scan
 * @returns WorkspaceScan with all discovered projects
 */
export async function discoverProjects(parentDir: string): Promise<WorkspaceScan> {
  const entries = await fs.readdir(parentDir, { withFileTypes: true });

  const projectChecks = entries
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      if (entry.name.startsWith(".")) return false;
      if (SKIP_DIRS.has(entry.name)) return false;
      return true;
    })
    .map(async (entry): Promise<ProjectInfo | null> => {
      const projectPath = path.join(parentDir, entry.name);

      const [hasClaudeDir, hasClaudeMd, hasMcpJson] = await Promise.all([
        pathExists(path.join(projectPath, ".claude")),
        pathExists(path.join(projectPath, "CLAUDE.md")),
        pathExists(path.join(projectPath, ".mcp.json")),
      ]);

      // Only include projects with at least one Claude Code indicator
      if (!hasClaudeDir && !hasClaudeMd && !hasMcpJson) {
        return null;
      }

      const configFileCount = await countConfigFiles(projectPath);

      return {
        path: projectPath,
        name: entry.name,
        hasClaudeDir,
        hasClaudeMd,
        hasMcpJson,
        configFileCount,
      };
    });

  const results = await Promise.all(projectChecks);
  const projects = results
    .filter((p): p is ProjectInfo => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const configuredProjects = projects.filter((p) => p.configFileCount > 0).length;

  return {
    parentDir,
    projects,
    totalProjects: projects.length,
    configuredProjects,
  };
}
