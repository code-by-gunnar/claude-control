import type { ConfigScope } from "../scanner/types.js";

/**
 * A single permission entry parsed from a settings file.
 */
export interface PermissionEntry {
  /** Tool name (e.g., "Bash", "WebSearch", "Skill") */
  tool: string;
  /** Pattern if present (e.g., "ls:*", "domain:example.com") */
  pattern?: string;
  /** The rule type: allow, deny, or ask */
  rule: "allow" | "deny" | "ask";
  /** Which scope level this entry comes from */
  scope: ConfigScope;
  /** Absolute path to the source file */
  sourcePath: string;
  /** Original permission string as written in config */
  raw: string;
}

/**
 * The effective (merged) permission for a specific tool+pattern combination.
 */
export interface EffectivePermission {
  /** Tool name */
  tool: string;
  /** Pattern if present */
  pattern?: string;
  /** The winning rule after deny > ask > allow merge */
  effectiveRule: "allow" | "deny" | "ask";
  /** Which scope the winning entry comes from */
  effectiveScope: ConfigScope;
  /** File path of the winning entry */
  effectiveSourcePath: string;
  /** All entries for this tool+pattern across scopes (override chain) */
  overrides: PermissionEntry[];
}

/**
 * The complete result of permissions resolution.
 */
export interface PermissionsResult {
  /** All raw permission entries from all settings files */
  all: PermissionEntry[];
  /** Merged effective permissions per tool+pattern */
  effective: EffectivePermission[];
}
