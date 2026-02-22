import type { ScopedSettings, SettingsResult } from "./types.js";

/**
 * Resolves settings from multiple scopes into a merged view with source tracking.
 *
 * Priority (highest to lowest): local > project > user > managed
 */
export function resolveSettings(_scoped: ScopedSettings[]): SettingsResult {
  // TODO: implement in GREEN phase
  throw new Error("Not implemented");
}
