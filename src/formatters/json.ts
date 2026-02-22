import type { ConfigFile, ScanResult } from "../scanner/types.js";

/**
 * Strip content from credential-type files for defense in depth.
 * Even though the scanner never reads credentials, this provides an
 * extra safety layer for JSON output.
 */
function sanitizeFiles(files: ScanResult["files"]): ScanResult["files"] {
  return files.map((file) => {
    if (file.type === "credentials") {
      const { content: _content, ...rest } = file;
      return rest;
    }
    return file;
  });
}

/**
 * Format a full scan result as JSON.
 *
 * Returns indented JSON with all file details.
 * Credentials file content is stripped as defense in depth.
 */
export function formatScanJson(result: ScanResult): string {
  const sanitized: ScanResult = {
    ...result,
    files: sanitizeFiles(result.files),
  };
  return JSON.stringify(sanitized, null, 2);
}

/**
 * Format a status summary as JSON.
 *
 * Returns a simplified view with summary counts and a
 * reduced file list (path, scope, type, status only).
 */
export function formatStatusJson(result: ScanResult): string {
  const status = {
    timestamp: result.timestamp,
    projectDir: result.projectDir,
    summary: result.summary,
    files: result.files.map((f) => ({
      path: f.expectedPath,
      scope: f.scope,
      type: f.type,
      exists: f.exists,
      readable: f.readable,
      error: f.error ?? null,
    })),
  };
  return JSON.stringify(status, null, 2);
}

/**
 * Format CLAUDE.md memory files as JSON.
 *
 * Returns a JSON array of memory files with path, scope, existence,
 * size, and content.
 *
 * @param files - Only claude-md type files that exist
 */
export function formatMemoryJson(files: ConfigFile[]): string {
  const output = files.map((f) => ({
    path: f.expectedPath,
    scope: f.scope,
    exists: f.exists,
    sizeBytes: f.sizeBytes ?? null,
    content: typeof f.content === "string" ? f.content : null,
  }));
  return JSON.stringify(output, null, 2);
}

/**
 * Format a single CLAUDE.md file's content as JSON.
 *
 * Returns a JSON object with path, scope, and content.
 *
 * @param file - A single CLAUDE.md config file
 */
export function formatMemoryContentJson(file: ConfigFile): string {
  const output = {
    path: file.expectedPath,
    scope: file.scope,
    content: typeof file.content === "string" ? file.content : null,
  };
  return JSON.stringify(output, null, 2);
}
