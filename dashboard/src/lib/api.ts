/**
 * API client functions for fetching data from the claude-ctl server.
 *
 * All endpoints are relative (same origin as the dashboard).
 * Type definitions match the actual server response shapes.
 */

export interface StatusSummary {
  total: number;
  found: number;
  missing: number;
  errors: number;
}

export interface ConfigFile {
  scope: string;
  type: string;
  expectedPath: string;
  exists: boolean;
  sizeBytes?: number;
  content?: unknown;
}

export interface ScanResult {
  projectDir: string;
  summary: StatusSummary;
  files: ConfigFile[];
}

export interface ResolvedSetting {
  key: string;
  effectiveValue: unknown;
  effectiveScope: string;
  effectiveSourcePath: string;
  overrides: Array<{ scope: string; path: string; value: unknown }>;
}

export interface SettingsResult {
  settings: ResolvedSetting[];
}

export interface MemoryFile {
  scope: string;
  path: string;
  sizeBytes?: number;
  content?: string;
}

export interface McpServer {
  name: string;
  scope: string;
  source: string;
  type: string;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface McpResult {
  servers: McpServer[];
  duplicates: Array<{ name: string; sources: string[] }>;
}

export interface HookEntry {
  event: string;
  scope: string;
  source: string;
  hooks: Array<{
    type: string;
    command?: string;
    pattern?: string;
  }>;
}

export interface HooksResult {
  events: HookEntry[];
  availableEvents: string[];
  configuredEvents: string[];
  unconfiguredEvents: string[];
}

export interface CommandEntry {
  name: string;
  scope: string;
  source: string;
  type: string;
  path: string;
}

export interface CommandsResult {
  commands: CommandEntry[];
}

export interface EffectivePermission {
  tool: string;
  pattern?: string;
  effectiveRule: string;
  effectiveScope: string;
  effectiveSourcePath: string;
  overrides: Array<{
    tool: string;
    pattern?: string;
    rule: string;
    scope: string;
    sourcePath: string;
    raw: string;
  }>;
}

export interface PermissionsResult {
  all: Array<{
    tool: string;
    pattern?: string;
    rule: string;
    scope: string;
    sourcePath: string;
    raw: string;
  }>;
  effective: EffectivePermission[];
}

async function fetchJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`/api/${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchScan(): Promise<ScanResult> {
  return fetchJson<ScanResult>("scan");
}

export async function fetchStatus(): Promise<StatusSummary> {
  return fetchJson<StatusSummary>("status");
}

export async function fetchSettings(): Promise<SettingsResult> {
  return fetchJson<SettingsResult>("settings");
}

export async function fetchMemory(): Promise<MemoryFile[]> {
  return fetchJson<MemoryFile[]>("memory");
}

export async function fetchMcp(): Promise<McpResult> {
  return fetchJson<McpResult>("mcp");
}

export async function fetchHooks(): Promise<HooksResult> {
  return fetchJson<HooksResult>("hooks");
}

export async function fetchCommands(): Promise<CommandsResult> {
  return fetchJson<CommandsResult>("commands");
}

export async function fetchPermissions(): Promise<PermissionsResult> {
  return fetchJson<PermissionsResult>("permissions");
}
