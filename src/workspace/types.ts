/**
 * Information about a single discovered project in a workspace scan.
 */
export interface ProjectInfo {
  /** Absolute path to the project directory */
  path: string;
  /** Basename of the directory (e.g., "my-project") */
  name: string;
  /** Whether the project has a .claude/ directory */
  hasClaudeDir: boolean;
  /** Whether the project has a CLAUDE.md at root */
  hasClaudeMd: boolean;
  /** Whether the project has a .mcp.json file */
  hasMcpJson: boolean;
  /** How many Claude Code config files exist in this project */
  configFileCount: number;
}

/**
 * Result of scanning a parent directory for Claude Code projects.
 */
export interface WorkspaceScan {
  /** The parent directory that was scanned */
  parentDir: string;
  /** All discovered projects with Claude Code indicators */
  projects: ProjectInfo[];
  /** Total number of projects found */
  totalProjects: number;
  /** Number of projects with at least one config file */
  configuredProjects: number;
}

/**
 * A single entry in a cross-project comparison matrix.
 *
 * Each entry represents one "thing" (setting key, MCP server name, etc.)
 * and tracks which projects have it and what value they have.
 */
export interface ComparisonEntry {
  /** The key being compared (setting key, server name, hook event, etc.) */
  key: string;
  /** What type of config item this is */
  type: "setting" | "mcp" | "hook" | "permission" | "memory";
  /** Project name -> value (undefined if not present in that project) */
  values: Record<string, unknown>;
}

/**
 * The complete result of comparing configurations across multiple projects.
 */
export interface ComparisonResult {
  /** Names of projects being compared */
  projects: string[];
  /** Full paths of projects being compared */
  projectPaths: string[];
  /** All comparison entries across all config types */
  entries: ComparisonEntry[];
  /** Summary statistics about the comparison */
  summary: {
    /** Total number of entries where not all projects agree */
    totalDifferences: number;
    /** Project name -> count of items unique to that project */
    uniqueToProject: Record<string, number>;
  };
}
