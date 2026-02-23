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
  sourcePath: string;
  type: string;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface McpResult {
  servers: McpServer[];
  duplicates: Array<{
    name: string;
    locations: Array<{ scope: string; sourcePath: string }>;
  }>;
}

export interface HookEvent {
  event: string;
  scope: string;
  sourcePath: string;
  matchers: Array<{
    matcher?: string;
    hooks: Array<{
      type: string;
      command: string;
      async?: boolean;
    }>;
  }>;
}

export interface HookScript {
  fileName: string;
  path: string;
  sizeBytes: number;
  content: string;
}

export interface HooksResult {
  events: HookEvent[];
  availableEvents: string[];
  configuredEvents: string[];
  unconfiguredEvents: string[];
  hookScripts: HookScript[];
}

export interface CommandEntry {
  name: string;
  path: string;
  scope: string;
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

// --- Health types ---

export interface HealthCheck {
  id: string;
  label: string;
  category: string;
  passed: boolean;
  weight: number;
  recommendation?: string;
}

export interface HealthCategory {
  name: string;
  score: number;
  maxScore: number;
  checks: HealthCheck[];
}

export interface HealthResult {
  overallScore: number;
  grade: string;
  categories: HealthCategory[];
  recommendations: string[];
  summary: string;
}

// --- Memory import types ---

export interface MemoryImport {
  raw: string;
  resolvedPath: string;
  relativeTo: string;
  exists: boolean;
  error?: string;
}

export interface ResolvedMemoryFile {
  path: string;
  scope: string;
  imports: MemoryImport[];
  importChain: string[];
  hasCircular: boolean;
  circularAt?: string;
}

export interface MemoryImportResult {
  files: ResolvedMemoryFile[];
  brokenImports: MemoryImport[];
  totalImports: number;
  totalBroken: number;
}

// --- Workspace types ---

export interface ProjectInfo {
  path: string;
  name: string;
  hasClaudeDir: boolean;
  hasClaudeMd: boolean;
  hasMcpJson: boolean;
  configFileCount: number;
}

export interface WorkspaceScan {
  parentDir: string;
  projects: ProjectInfo[];
  totalProjects: number;
  configuredProjects: number;
}

export interface ComparisonEntry {
  key: string;
  type: "setting" | "mcp" | "hook" | "permission" | "memory";
  values: Record<string, unknown>;
}

export interface ComparisonResult {
  projects: string[];
  projectPaths: string[];
  entries: ComparisonEntry[];
  summary: {
    totalDifferences: number;
    uniqueToProject: Record<string, number>;
  };
}

// --- Agent types ---

export interface AgentInfo {
  name: string;
  fileName: string;
  path: string;
  description: string | null;
  color: string | null;
  tools: string[];
  model: string | null;
  sizeBytes: number;
  content: string;
}

export interface AgentsResult {
  agents: AgentInfo[];
  totalCount: number;
  agentsDir: string;
}

// --- Marketplace types ---

export interface MarketplacePlugin {
  name: string;
  marketplace: string;
  directory: "plugins" | "external_plugins";
  description: string | null;
  installed: boolean;
  enabled: boolean;
  blocked: boolean;
  installCount: number | null;
}

export interface MarketplaceInfo {
  id: string;
  source: { source: string; repo: string };
  installLocation: string;
  lastUpdated: string;
  pluginCount: number;
  plugins: MarketplacePlugin[];
}

export interface MarketplacesResult {
  marketplaces: MarketplaceInfo[];
  totalPlugins: number;
  blockedPlugins: { plugin: string; reason: string }[];
}

// --- Account types ---

export interface AccountInfo {
  subscriptionType: string | null;
  rateLimitTier: string | null;
}

// --- Version types ---

export interface VersionInfo {
  version: string;
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

// --- Plugin types ---

export interface PluginInfo {
  name: string;
  marketplace: string;
  key: string;
  enabled: boolean;
  scope: string;
  sourcePath: string;
  pluginDir: string;
  installed: boolean;
  mcpServers: string[];
  version: string | null;
  installedAt: string | null;
  lastUpdated: string | null;
  pluginType: "mcp" | "skills" | "hybrid";
  description: string | null;
  installPath: string | null;
}

export interface PluginsResult {
  plugins: PluginInfo[];
  totalCount: number;
  enabledCount: number;
  installedCount: number;
}

export async function fetchPlugins(): Promise<PluginsResult> {
  return fetchJson<PluginsResult>("plugins");
}

export async function fetchCommands(): Promise<CommandsResult> {
  return fetchJson<CommandsResult>("commands");
}

export async function fetchPermissions(): Promise<PermissionsResult> {
  return fetchJson<PermissionsResult>("permissions");
}

export async function fetchHealth(): Promise<HealthResult> {
  return fetchJson<HealthResult>("health");
}

export async function fetchMemoryImports(): Promise<MemoryImportResult> {
  return fetchJson<MemoryImportResult>("memory/imports");
}

export async function fetchProjects(dir: string): Promise<WorkspaceScan> {
  const response = await fetch(`/api/projects?dir=${encodeURIComponent(dir)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error: ${response.status}`);
  }
  return response.json() as Promise<WorkspaceScan>;
}

export async function removePermission(
  sourcePath: string,
  rule: "allow" | "deny" | "ask",
  raw: string
): Promise<{ success: boolean }> {
  const response = await fetch("/api/permissions/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourcePath, rule, raw }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `API error: ${response.status}`
    );
  }
  return response.json() as Promise<{ success: boolean }>;
}

export async function fetchCompare(projectPaths: string[]): Promise<ComparisonResult> {
  const query = projectPaths.map((p) => encodeURIComponent(p)).join(",");
  const response = await fetch(`/api/compare?projects=${query}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error: ${response.status}`);
  }
  return response.json() as Promise<ComparisonResult>;
}

export async function fetchAgents(): Promise<AgentsResult> {
  return fetchJson<AgentsResult>("agents");
}

export async function fetchMarketplaces(): Promise<MarketplacesResult> {
  return fetchJson<MarketplacesResult>("marketplaces");
}

export async function fetchAccount(): Promise<AccountInfo> {
  return fetchJson<AccountInfo>("account");
}

export async function fetchVersion(): Promise<VersionInfo> {
  return fetchJson<VersionInfo>("version");
}
