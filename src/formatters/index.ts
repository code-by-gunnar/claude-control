import type { ConfigFile, ScanResult } from "../scanner/types.js";
import type { SettingsResult } from "../settings/types.js";
import { formatMemoryContentJson, formatMemoryJson, formatScanJson, formatSettingsJson, formatStatusJson } from "./json.js";
import { formatMemoryContentTable, formatMemoryTable, formatScanTable, formatSettingsTable, formatStatusTable } from "./table.js";

/**
 * Format a scan result for display.
 *
 * @param result - The scan result to format
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatScan(result: ScanResult, json: boolean): string {
  return json ? formatScanJson(result) : formatScanTable(result);
}

/**
 * Format a status summary for display.
 *
 * @param result - The scan result to format as a status summary
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatStatus(result: ScanResult, json: boolean): string {
  return json ? formatStatusJson(result) : formatStatusTable(result);
}

/**
 * Format CLAUDE.md memory files for display.
 *
 * @param files - Only claude-md type files that exist
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatMemory(
  files: ConfigFile[],
  projectDir: string | null,
  json: boolean
): string {
  return json ? formatMemoryJson(files) : formatMemoryTable(files, projectDir);
}

/**
 * Format a single CLAUDE.md file's content for display.
 *
 * @param file - A single CLAUDE.md config file
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatMemoryContent(file: ConfigFile, json: boolean): string {
  return json
    ? formatMemoryContentJson(file)
    : formatMemoryContentTable(file);
}

/**
 * Format resolved settings for display.
 *
 * @param result - The resolved settings result
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatSettings(
  result: SettingsResult,
  projectDir: string | null,
  json: boolean
): string {
  return json
    ? formatSettingsJson(result)
    : formatSettingsTable(result, projectDir);
}

// Re-export individual formatters for direct access
export { formatMemoryContentJson, formatMemoryJson, formatScanJson, formatSettingsJson, formatStatusJson } from "./json.js";
export { formatMemoryContentTable, formatMemoryTable, formatScanTable, formatSettingsTable, formatStatusTable } from "./table.js";
