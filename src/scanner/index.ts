import fs from "node:fs/promises";
import { getConfigPaths, getGlobalClaudeDir } from "./paths.js";
import { parseJsonc, readMarkdown } from "./parser.js";
import type { ConfigFile, ConfigFileExpectation, ScanResult } from "./types.js";

/**
 * Check whether a path exists and whether it's a file or directory.
 */
async function checkExists(
  filePath: string
): Promise<{ exists: boolean; isDirectory: boolean; sizeBytes?: number }> {
  try {
    const stat = await fs.stat(filePath);
    return {
      exists: true,
      isDirectory: stat.isDirectory(),
      sizeBytes: stat.isDirectory() ? undefined : stat.size,
    };
  } catch {
    return { exists: false, isDirectory: false };
  }
}

/**
 * Scan a single expected config file location and return its actual state.
 */
async function scanFile(expectation: ConfigFileExpectation): Promise<ConfigFile> {
  const result: ConfigFile = {
    ...expectation,
    exists: false,
    readable: false,
  };

  try {
    const check = await checkExists(expectation.expectedPath);

    if (!check.exists) {
      return result;
    }

    result.exists = true;
    result.sizeBytes = check.sizeBytes;

    // For directories (commands-dir), just check existence
    if (expectation.type === "commands-dir") {
      if (check.isDirectory) {
        result.readable = true;
      } else {
        result.error = "Expected directory but found file";
      }
      return result;
    }

    // Security: Never read credentials content
    if (expectation.type === "credentials") {
      result.readable = false;
      return result;
    }

    // Read and parse the file based on type
    if (expectation.type === "claude-md") {
      const content = await readMarkdown(expectation.expectedPath);
      result.content = content;
      result.readable = true;
    } else {
      // JSON/JSONC files: settings, keybindings, mcp, hooks
      const { data, errors } = await parseJsonc(expectation.expectedPath);
      result.content = data;
      result.readable = true;

      if (errors.length > 0) {
        result.error = `Parse warning: ${errors.join("; ")}`;
      }
    }
  } catch (err: unknown) {
    result.exists = true;

    if (err instanceof Error) {
      if ("code" in err && (err as NodeJS.ErrnoException).code === "EACCES") {
        result.error = "Permission denied";
      } else if (
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        // Race condition: file disappeared between stat and read
        result.exists = false;
        result.error = undefined;
      } else {
        result.error = err.message;
      }
    } else {
      result.error = String(err);
    }
  }

  return result;
}

/**
 * Scan all expected Claude Code configuration file locations.
 *
 * Discovers config files across global (~/.claude/) and optionally project-level
 * (.claude/ in project root) directories. Each file is checked independently --
 * one failure never crashes the entire scan.
 *
 * @param projectDir - Optional absolute path to the project root. If omitted, only global paths are scanned.
 * @returns A ScanResult with all discovered files and summary counts.
 */
export async function scan(projectDir?: string): Promise<ScanResult> {
  const expectations = getConfigPaths(projectDir);

  // Scan all files in parallel — each file is independent
  const files = await Promise.all(expectations.map(scanFile));

  // Compute summary
  const found = files.filter((f) => f.exists).length;
  const errors = files.filter((f) => f.exists && f.error).length;
  const missing = files.filter((f) => !f.exists).length;

  return {
    timestamp: new Date().toISOString(),
    projectDir: projectDir ?? null,
    globalDir: getGlobalClaudeDir(),
    files,
    summary: {
      total: files.length,
      found,
      missing,
      errors,
    },
  };
}

// Re-export types and utilities for convenient access
export type { ConfigFile, ConfigFileExpectation, ScanResult } from "./types.js";
export type { ConfigScope, ConfigFileType } from "./types.js";
export { getConfigPaths, getGlobalClaudeDir } from "./paths.js";
export { parseJsonc, readMarkdown } from "./parser.js";
