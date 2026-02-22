import type { ConfigFile, ConfigScope } from "../scanner/types.js";
import type {
  PermissionEntry,
  EffectivePermission,
  PermissionsResult,
} from "./types.js";

/**
 * Scope priority order: index = priority (higher index = higher priority).
 */
const SCOPE_PRIORITY: ConfigScope[] = ["managed", "user", "project", "local"];

/**
 * Returns the priority index for a scope (higher = overrides lower).
 */
function scopePriority(scope: ConfigScope): number {
  return SCOPE_PRIORITY.indexOf(scope);
}

/**
 * Rule priority: deny > ask > allow.
 * Higher number = higher priority (wins).
 */
const RULE_PRIORITY: Record<string, number> = {
  allow: 0,
  ask: 1,
  deny: 2,
};

/**
 * Parse a permission string into tool name and optional pattern.
 *
 * Formats:
 *   "ToolName"          -> tool="ToolName", pattern=undefined
 *   "ToolName(pattern)" -> tool="ToolName", pattern="pattern"
 *
 * Handles complex patterns like `Bash(ls "D:/path")` and
 * MCP tool names like `mcp__plugin_context7_context7__resolve-library-id`.
 */
function parsePermissionString(raw: string): { tool: string; pattern?: string } {
  const match = raw.match(/^([^(]+?)(?:\((.+)\))?$/);
  if (!match) {
    return { tool: raw };
  }

  const tool = match[1].trim();
  const pattern = match[2]?.trim();

  return { tool, pattern: pattern || undefined };
}

/**
 * Build a unique key for grouping permissions by tool+pattern.
 */
function groupKey(tool: string, pattern?: string): string {
  return pattern ? `${tool}(${pattern})` : tool;
}

/**
 * Resolve permissions from scanned config files into a merged view.
 *
 * Extracts permissions from settings files that have a "permissions" key
 * with "allow", "deny", and/or "ask" sub-keys containing string arrays.
 *
 * Merge logic: deny > ask > allow priority.
 * Within the same priority level, higher scope wins (local > project > user > managed).
 *
 * @param files - All scanned config files
 * @returns Merged permissions result with all entries and effective permissions
 */
export function resolvePermissions(files: ConfigFile[]): PermissionsResult {
  const all: PermissionEntry[] = [];

  // Step 1: Extract all permission entries from settings files
  for (const file of files) {
    // Only process settings files that exist, are readable, and have content
    if (
      file.type !== "settings" ||
      !file.exists ||
      !file.readable ||
      file.content === undefined ||
      file.content === null ||
      typeof file.content !== "object"
    ) {
      continue;
    }

    const content = file.content as Record<string, unknown>;
    const permissions = content.permissions;

    if (
      permissions === undefined ||
      permissions === null ||
      typeof permissions !== "object"
    ) {
      continue;
    }

    const permObj = permissions as Record<string, unknown>;

    // Iterate over rule types: allow, deny, ask
    for (const ruleType of ["allow", "deny", "ask"] as const) {
      const entries = permObj[ruleType];
      if (!Array.isArray(entries)) {
        continue;
      }

      for (const raw of entries) {
        if (typeof raw !== "string") {
          continue;
        }

        const { tool, pattern } = parsePermissionString(raw);

        all.push({
          tool,
          pattern,
          rule: ruleType,
          scope: file.scope,
          sourcePath: file.expectedPath,
          raw,
        });
      }
    }
  }

  // Step 2: Group entries by tool+pattern
  const groups = new Map<string, PermissionEntry[]>();

  for (const entry of all) {
    const key = groupKey(entry.tool, entry.pattern);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  // Step 3: Merge each group to determine effective permission
  const effective: EffectivePermission[] = [];

  for (const [, entries] of groups) {
    // Sort by rule priority (highest first), then by scope priority (highest first)
    const sorted = [...entries].sort((a, b) => {
      const ruleDiff = RULE_PRIORITY[b.rule] - RULE_PRIORITY[a.rule];
      if (ruleDiff !== 0) return ruleDiff;
      return scopePriority(b.scope) - scopePriority(a.scope);
    });

    const winner = sorted[0];

    effective.push({
      tool: winner.tool,
      pattern: winner.pattern,
      effectiveRule: winner.rule,
      effectiveScope: winner.scope,
      effectiveSourcePath: winner.sourcePath,
      overrides: sorted,
    });
  }

  // Step 4: Sort effective permissions by tool name, then pattern
  effective.sort((a, b) => {
    const toolCmp = a.tool.localeCompare(b.tool);
    if (toolCmp !== 0) return toolCmp;
    const aPattern = a.pattern ?? "";
    const bPattern = b.pattern ?? "";
    return aPattern.localeCompare(bPattern);
  });

  return { all, effective };
}
