import os from "node:os";
import path from "node:path";
import type { ConfigFileExpectation } from "./types.js";

/**
 * Get the user's home directory in a cross-platform way.
 *
 * Primary: os.homedir()
 * Fallback (Windows): USERPROFILE env var
 * Fallback (all): HOME env var
 */
function getHomeDir(): string {
  const home = os.homedir();
  if (home) return home;

  // Windows fallback
  if (process.env.USERPROFILE) return process.env.USERPROFILE;

  // Unix fallback
  if (process.env.HOME) return process.env.HOME;

  throw new Error(
    "Unable to determine home directory. Set HOME or USERPROFILE environment variable."
  );
}

/**
 * Get the global Claude configuration directory.
 */
export function getGlobalClaudeDir(): string {
  return path.join(getHomeDir(), ".claude");
}

/**
 * Get the system-wide managed settings path (enterprise/organization-managed).
 *
 * Managed settings are installed by enterprise admins and apply system-wide.
 * Path follows platform conventions for system-level application config.
 */
function getManagedSettingsPath(): string {
  switch (process.platform) {
    case "win32":
      return path.join(
        process.env.PROGRAMDATA || "C:\\ProgramData",
        ".claude",
        "settings.json"
      );
    case "darwin":
      return path.join(
        "/Library",
        "Application Support",
        ".claude",
        "settings.json"
      );
    default:
      // Linux and other Unix-like
      return path.join("/etc", ".claude", "settings.json");
  }
}

/**
 * Returns all expected Claude Code configuration file locations.
 *
 * When called without a projectDir, returns only global (user-level) paths.
 * When called with a projectDir, returns both global and project-level paths.
 *
 * @param projectDir - Optional absolute path to the project root directory
 * @returns Array of expected config file locations
 */
export function getConfigPaths(projectDir?: string): ConfigFileExpectation[] {
  const globalClaudeDir = getGlobalClaudeDir();
  const expectations: ConfigFileExpectation[] = [];

  // --- Managed (enterprise) paths ---

  expectations.push({
    scope: "managed",
    type: "settings",
    expectedPath: getManagedSettingsPath(),
    description: "Enterprise/organization-managed settings (system-wide)",
  });

  // --- Global (user-level) paths ---

  expectations.push({
    scope: "user",
    type: "settings",
    expectedPath: path.join(globalClaudeDir, "settings.json"),
    description: "User-level settings",
  });

  expectations.push({
    scope: "user",
    type: "credentials",
    expectedPath: path.join(globalClaudeDir, "credentials.json"),
    description: "User credentials (existence check only — content never read)",
  });

  expectations.push({
    scope: "user",
    type: "keybindings",
    expectedPath: path.join(globalClaudeDir, "keybindings.json"),
    description: "User-level keybindings",
  });

  expectations.push({
    scope: "user",
    type: "claude-md",
    expectedPath: path.join(globalClaudeDir, "CLAUDE.md"),
    description: "User-level CLAUDE.md memory file",
  });

  expectations.push({
    scope: "user",
    type: "commands-dir",
    expectedPath: path.join(globalClaudeDir, "commands"),
    description: "User-level custom commands directory",
  });

  // --- Project-level paths (only if projectDir provided) ---

  if (projectDir) {
    const projectClaudeDir = path.join(projectDir, ".claude");

    expectations.push({
      scope: "project",
      type: "settings",
      expectedPath: path.join(projectClaudeDir, "settings.json"),
      description: "Project-level settings",
    });

    expectations.push({
      scope: "local",
      type: "settings",
      expectedPath: path.join(projectClaudeDir, "settings.local.json"),
      description: "Local settings override (not committed to VCS)",
    });

    expectations.push({
      scope: "project",
      type: "claude-md",
      expectedPath: path.join(projectDir, "CLAUDE.md"),
      description: "Project root CLAUDE.md memory file",
    });

    expectations.push({
      scope: "project",
      type: "claude-md",
      expectedPath: path.join(projectClaudeDir, "CLAUDE.md"),
      description: "Project .claude/ directory CLAUDE.md memory file",
    });

    expectations.push({
      scope: "project",
      type: "commands-dir",
      expectedPath: path.join(projectClaudeDir, "commands"),
      description: "Project-level custom commands directory",
    });
  }

  return expectations;
}
