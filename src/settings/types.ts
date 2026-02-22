import type { ConfigScope } from "../scanner/types.js";

/**
 * Settings from a single scope, as parsed from a config file.
 */
export interface ScopedSettings {
  /** Which scope level these settings come from */
  scope: ConfigScope;
  /** Absolute path to the source file */
  path: string;
  /** Parsed settings key-value pairs */
  settings: Record<string, unknown>;
}

/**
 * An entry in the override chain showing a setting value at a specific scope.
 */
export interface OverrideEntry {
  scope: ConfigScope;
  path: string;
  value: unknown;
}

/**
 * A single resolved setting with source tracking.
 */
export interface ResolvedSetting {
  /** The top-level setting key */
  key: string;
  /** The value from the highest-priority scope */
  effectiveValue: unknown;
  /** Which scope the effective value comes from */
  effectiveScope: ConfigScope;
  /** File path of the winning scope */
  effectiveSourcePath: string;
  /** All scopes defining this key, sorted by priority (highest first) */
  overrides: OverrideEntry[];
}

/**
 * The complete result of settings resolution.
 */
export interface SettingsResult {
  /** Resolved settings, one per unique key, sorted alphabetically by key */
  settings: ResolvedSetting[];
}
