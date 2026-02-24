import type { ConfigFile, ScanResult } from "../scanner/types.js";
import type { AccountInfo } from "../account/resolver.js";
import type { AgentsResult } from "../agents/types.js";
import type { HealthResult } from "../health/types.js";
import type { CommandsResult, HooksResult } from "../hooks/types.js";
import type { MarketplacesResult } from "../marketplace/types.js";
import type { McpResult } from "../mcp/types.js";
import type { MemoryImportResult } from "../memory/types.js";
import type { PermissionsResult } from "../permissions/types.js";
import type { PluginsResult } from "../plugins/types.js";
import type { SettingsResult } from "../settings/types.js";
import type { SkillScanResult } from "../skills/types.js";
import { formatAccountJson, formatAccountTable } from "./account.js";
import { formatAgentsJson, formatAgentsTable } from "./agents.js";
import { formatCommandsJson, formatCommandsTable, formatHooksJson, formatHooksTable } from "./hooks.js";
import { formatHealthJson, formatHealthTable } from "./health.js";
import { formatMemoryContentJson, formatMemoryJson, formatScanJson, formatSettingsJson, formatStatusJson } from "./json.js";
import { formatMarketplacesJson, formatMarketplacesTable } from "./marketplaces.js";
import { formatMcpJson, formatMcpTable } from "./mcp.js";
import { formatMemoryImportsJson, formatMemoryImportsTable } from "./memory.js";
import { formatPermissionsJson, formatPermissionsTable } from "./permissions.js";
import { formatPluginsJson, formatPluginsTable } from "./plugins.js";
import { formatSkillsScanJson, formatSkillsScanTable } from "./skills-scan.js";
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

/**
 * Format MCP server extraction results for display.
 *
 * @param result - The MCP extraction result
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatMcp(
  result: McpResult,
  projectDir: string | null,
  json: boolean
): string {
  return json
    ? formatMcpJson(result)
    : formatMcpTable(result, projectDir);
}

/**
 * Format hooks extraction results for display.
 *
 * @param result - The hooks extraction result
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatHooks(
  result: HooksResult,
  projectDir: string | null,
  json: boolean
): string {
  return json
    ? formatHooksJson(result)
    : formatHooksTable(result, projectDir);
}

/**
 * Format commands extraction results for display.
 *
 * @param result - The commands extraction result
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatCommands(
  result: CommandsResult,
  projectDir: string | null,
  json: boolean
): string {
  return json
    ? formatCommandsJson(result)
    : formatCommandsTable(result, projectDir);
}

/**
 * Format permissions resolution results for display.
 *
 * @param result - The resolved permissions result
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatPermissions(
  result: PermissionsResult,
  projectDir: string | null,
  json: boolean
): string {
  return json
    ? formatPermissionsJson(result)
    : formatPermissionsTable(result, projectDir);
}

/**
 * Format memory import analysis for display.
 *
 * @param result - The memory import resolution result
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatMemoryImports(
  result: MemoryImportResult,
  projectDir: string | null,
  json: boolean
): string {
  return json
    ? formatMemoryImportsJson(result)
    : formatMemoryImportsTable(result, projectDir);
}

/**
 * Format health assessment results for display.
 *
 * @param result - The health assessment result
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatHealth(
  result: HealthResult,
  projectDir: string | null,
  json: boolean
): string {
  return json
    ? formatHealthJson(result)
    : formatHealthTable(result, projectDir);
}

/**
 * Format agents extraction results for display.
 *
 * @param result - The agents extraction result
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatAgents(result: AgentsResult, json: boolean): string {
  return json ? formatAgentsJson(result) : formatAgentsTable(result);
}

/**
 * Format plugins extraction results for display.
 *
 * @param result - The plugins extraction result
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatPlugins(result: PluginsResult, json: boolean): string {
  return json ? formatPluginsJson(result) : formatPluginsTable(result);
}

/**
 * Format marketplaces extraction results for display.
 *
 * @param result - The marketplaces extraction result
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatMarketplaces(
  result: MarketplacesResult,
  json: boolean
): string {
  return json
    ? formatMarketplacesJson(result)
    : formatMarketplacesTable(result);
}

/**
 * Format account info for display.
 *
 * @param result - The account info result
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatAccount(result: AccountInfo, json: boolean): string {
  return json ? formatAccountJson(result) : formatAccountTable(result);
}

/**
 * Format skill scan results for display.
 *
 * @param result - The skill scan result
 * @param projectDir - The project directory, or null for global-only scans
 * @param json - If true, output JSON; otherwise output a human-readable table
 */
export function formatSkillsScan(
  result: SkillScanResult,
  projectDir: string | null,
  json: boolean
): string {
  return json
    ? formatSkillsScanJson(result)
    : formatSkillsScanTable(result, projectDir);
}

// Re-export individual formatters for direct access
export { formatAccountJson, formatAccountTable } from "./account.js";
export { formatAgentsJson, formatAgentsTable } from "./agents.js";
export { formatCommandsJson, formatCommandsTable, formatHooksJson, formatHooksTable } from "./hooks.js";
export { formatHealthJson, formatHealthTable } from "./health.js";
export { formatMemoryContentJson, formatMemoryJson, formatScanJson, formatSettingsJson, formatStatusJson } from "./json.js";
export { formatMarketplacesJson, formatMarketplacesTable } from "./marketplaces.js";
export { formatMcpJson, formatMcpTable } from "./mcp.js";
export { formatMemoryImportsJson, formatMemoryImportsTable } from "./memory.js";
export { formatPermissionsJson, formatPermissionsTable } from "./permissions.js";
export { formatPluginsJson, formatPluginsTable } from "./plugins.js";
export { formatMemoryContentTable, formatMemoryTable, formatScanTable, formatSettingsTable, formatStatusTable } from "./table.js";
export { formatSkillsScanJson, formatSkillsScanTable } from "./skills-scan.js";
export { formatDiscovery, formatCompare } from "./compare.js";
