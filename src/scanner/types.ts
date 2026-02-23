/**
 * The scope level at which a configuration file exists.
 *
 * - "managed": Enterprise/organization-managed settings (reserved for future use)
 * - "user": Global user-level settings (~/.claude/)
 * - "project": Project-level settings (.claude/ in project root)
 * - "local": Local overrides (.claude/settings.local.json) — not committed to VCS
 */
export type ConfigScope = "managed" | "user" | "project" | "local";

/**
 * The type of configuration file.
 */
export type ConfigFileType =
  | "settings"
  | "claude-md"
  | "commands-dir"
  | "skills-dir"
  | "mcp"
  | "hooks"
  | "credentials"
  | "keybindings";

/**
 * Describes an expected configuration file location before it has been checked.
 */
export interface ConfigFileExpectation {
  /** The scope level this config belongs to */
  scope: ConfigScope;
  /** The type of configuration */
  type: ConfigFileType;
  /** The absolute path where this config file is expected to exist */
  expectedPath: string;
  /** Human-readable description (e.g., "User-level settings") */
  description: string;
}

/**
 * A discovered (or missing) configuration file with its actual state.
 */
export interface ConfigFile extends ConfigFileExpectation {
  /** Whether the file/directory exists on disk */
  exists: boolean;
  /** Whether the file could be read (false if missing or permission denied) */
  readable: boolean;
  /** Error message if something went wrong (e.g., "Permission denied", "Parse error: ...") */
  error?: string;
  /** Parsed content for JSON/JSONC files, raw string for .md files, undefined if not read */
  content?: unknown;
  /** File size in bytes, if available */
  sizeBytes?: number;
}

/**
 * The complete result of a configuration scan.
 */
export interface ScanResult {
  /** ISO 8601 timestamp of when the scan was performed */
  timestamp: string;
  /** The project directory that was scanned, or null for global-only scans */
  projectDir: string | null;
  /** The global Claude config directory (e.g., ~/.claude) */
  globalDir: string;
  /** All discovered and expected configuration files */
  files: ConfigFile[];
  /** Summary counts */
  summary: {
    /** Total number of expected config file locations */
    total: number;
    /** Number of files/directories that exist */
    found: number;
    /** Number of files/directories that are missing */
    missing: number;
    /** Number of files that exist but had errors (parse errors, permission denied, etc.) */
    errors: number;
  };
}
