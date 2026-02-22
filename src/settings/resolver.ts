import type { ConfigScope } from "../scanner/types.js";
import type {
  ScopedSettings,
  ResolvedSetting,
  OverrideEntry,
  SettingsResult,
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
 * Resolves settings from multiple scopes into a merged view with source tracking.
 *
 * Priority (highest to lowest): local > project > user > managed
 *
 * Each setting key is resolved to its highest-priority scope value.
 * The override chain shows all scopes that define a given key,
 * sorted by priority (highest first).
 */
export function resolveSettings(scoped: ScopedSettings[]): SettingsResult {
  // Collect all values per key, tagged with scope metadata
  const keyMap = new Map<string, OverrideEntry[]>();

  for (const entry of scoped) {
    for (const [key, value] of Object.entries(entry.settings)) {
      if (!keyMap.has(key)) {
        keyMap.set(key, []);
      }
      keyMap.get(key)!.push({
        scope: entry.scope,
        path: entry.path,
        value,
      });
    }
  }

  // Build resolved settings
  const settings: ResolvedSetting[] = [];

  for (const [key, entries] of keyMap) {
    // Sort overrides by priority (highest first)
    const sorted = entries.sort(
      (a, b) => scopePriority(b.scope) - scopePriority(a.scope),
    );

    const winner = sorted[0];

    settings.push({
      key,
      effectiveValue: winner.value,
      effectiveScope: winner.scope,
      effectiveSourcePath: winner.path,
      overrides: sorted,
    });
  }

  // Sort results alphabetically by key
  settings.sort((a, b) => a.key.localeCompare(b.key));

  return { settings };
}
