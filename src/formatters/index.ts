import type { ScanResult } from "../scanner/types.js";
import { formatScanJson, formatStatusJson } from "./json.js";
import { formatScanTable, formatStatusTable } from "./table.js";

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

// Re-export individual formatters for direct access
export { formatScanJson, formatStatusJson } from "./json.js";
export { formatScanTable, formatStatusTable } from "./table.js";
