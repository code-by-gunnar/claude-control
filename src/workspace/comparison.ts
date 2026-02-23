import path from "node:path";
import { scan } from "../scanner/index.js";
import { resolveSettings } from "../settings/resolver.js";
import { extractMcpServers } from "../mcp/resolver.js";
import { extractHooks } from "../hooks/resolver.js";
import { resolvePermissions } from "../permissions/resolver.js";
import type { ScopedSettings } from "../settings/types.js";
import type { ComparisonEntry, ComparisonResult } from "./types.js";

/**
 * Maximum number of projects that can be compared at once.
 * Prevents excessive memory usage when many projects are selected.
 */
const MAX_PROJECTS = 10;

/**
 * Extract settings key-value pairs from a scan result.
 */
function extractSettingsMap(
  files: Awaited<ReturnType<typeof scan>>["files"]
): Record<string, unknown> {
  const settingsFiles = files.filter(
    (f) =>
      f.type === "settings" &&
      f.exists &&
      f.content !== undefined &&
      f.content !== null &&
      typeof f.content === "object"
  );

  const scopedSettings: ScopedSettings[] = settingsFiles.map((f) => ({
    scope: f.scope,
    path: f.expectedPath,
    settings: f.content as Record<string, unknown>,
  }));

  const result = resolveSettings(scopedSettings);
  const map: Record<string, unknown> = {};
  for (const setting of result.settings) {
    map[setting.key] = setting.effectiveValue;
  }
  return map;
}

/**
 * Extract MCP server names from a scan result.
 */
async function extractMcpMap(
  files: Awaited<ReturnType<typeof scan>>["files"]
): Promise<Record<string, string>> {
  const mcpResult = await extractMcpServers(files);
  const map: Record<string, string> = {};
  for (const server of mcpResult.servers) {
    map[server.name] = server.type;
  }
  return map;
}

/**
 * Extract configured hook events from a scan result.
 */
async function extractHooksMap(
  files: Awaited<ReturnType<typeof scan>>["files"]
): Promise<Record<string, number>> {
  const hooksResult = await extractHooks(files);
  const map: Record<string, number> = {};
  for (const event of hooksResult.events) {
    map[event.event] = (map[event.event] ?? 0) + event.matchers.length;
  }
  return map;
}

/**
 * Extract effective permissions from a scan result.
 */
function extractPermissionsMap(
  files: Awaited<ReturnType<typeof scan>>["files"]
): Record<string, string> {
  const permResult = resolvePermissions(files);
  const map: Record<string, string> = {};
  for (const perm of permResult.effective) {
    const key = perm.pattern ? `${perm.tool}(${perm.pattern})` : perm.tool;
    map[key] = perm.effectiveRule;
  }
  return map;
}

/**
 * Extract CLAUDE.md memory info from a scan result.
 */
function extractMemoryMap(
  files: Awaited<ReturnType<typeof scan>>["files"]
): Record<string, unknown> {
  const memoryFiles = files.filter(
    (f) => f.type === "claude-md" && f.exists
  );
  const map: Record<string, unknown> = {};
  for (const f of memoryFiles) {
    const label = f.scope === "user" ? "user CLAUDE.md" : "project CLAUDE.md";
    map[label] = f.sizeBytes ?? true;
  }
  return map;
}

/**
 * Compare configurations across multiple projects side-by-side.
 *
 * For each project path, runs a full scan() and then extracts settings,
 * MCP servers, hooks, permissions, and CLAUDE.md info. Builds a comparison
 * matrix showing where projects differ.
 *
 * @param projectPaths - Array of absolute paths to project directories (max 10)
 * @returns ComparisonResult with all entries and summary statistics
 * @throws Error if more than MAX_PROJECTS are provided
 */
export async function compareProjects(
  projectPaths: string[]
): Promise<ComparisonResult> {
  if (projectPaths.length > MAX_PROJECTS) {
    throw new Error(
      `Cannot compare more than ${MAX_PROJECTS} projects at once (got ${projectPaths.length})`
    );
  }

  if (projectPaths.length < 2) {
    throw new Error("Need at least 2 projects to compare");
  }

  const projectNames = projectPaths.map((p) => path.basename(p));

  // Scan all projects in parallel
  const scanResults = await Promise.all(
    projectPaths.map((p) => scan(p))
  );

  // Extract data from each project
  const settingsMaps: Record<string, unknown>[] = [];
  const mcpMaps: Record<string, string>[] = [];
  const hooksMaps: Record<string, number>[] = [];
  const permissionsMaps: Record<string, string>[] = [];
  const memoryMaps: Record<string, unknown>[] = [];

  for (const result of scanResults) {
    settingsMaps.push(extractSettingsMap(result.files));
    mcpMaps.push(await extractMcpMap(result.files));
    hooksMaps.push(await extractHooksMap(result.files));
    permissionsMaps.push(extractPermissionsMap(result.files));
    memoryMaps.push(extractMemoryMap(result.files));
  }

  const entries: ComparisonEntry[] = [];

  // Build comparison entries for each type
  buildEntries(entries, "setting", projectNames, settingsMaps);
  buildEntries(entries, "mcp", projectNames, mcpMaps);
  buildEntries(entries, "hook", projectNames, hooksMaps);
  buildEntries(entries, "permission", projectNames, permissionsMaps);
  buildEntries(entries, "memory", projectNames, memoryMaps);

  // Compute summary
  let totalDifferences = 0;
  const uniqueToProject: Record<string, number> = {};
  for (const name of projectNames) {
    uniqueToProject[name] = 0;
  }

  for (const entry of entries) {
    const presentIn = projectNames.filter(
      (name) => entry.values[name] !== undefined
    );
    const values = presentIn.map((name) => JSON.stringify(entry.values[name]));
    const allSame = new Set(values).size <= 1 && presentIn.length === projectNames.length;

    if (!allSame) {
      totalDifferences++;
    }

    // Count unique items (present in only one project)
    if (presentIn.length === 1) {
      uniqueToProject[presentIn[0]]++;
    }
  }

  return {
    projects: projectNames,
    projectPaths,
    entries,
    summary: {
      totalDifferences,
      uniqueToProject,
    },
  };
}

/**
 * Build comparison entries from per-project maps for a given type.
 *
 * Collects all unique keys across all projects, then for each key
 * records which projects have it and what value they have.
 */
function buildEntries(
  entries: ComparisonEntry[],
  type: ComparisonEntry["type"],
  projectNames: string[],
  maps: Record<string, unknown>[]
): void {
  // Collect all unique keys across all projects
  const allKeys = new Set<string>();
  for (const map of maps) {
    for (const key of Object.keys(map)) {
      allKeys.add(key);
    }
  }

  // Build an entry for each key
  for (const key of [...allKeys].sort()) {
    const values: Record<string, unknown> = {};
    for (let i = 0; i < projectNames.length; i++) {
      const val = maps[i][key];
      if (val !== undefined) {
        values[projectNames[i]] = val;
      }
    }

    entries.push({ key, type, values });
  }
}
