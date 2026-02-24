import type { ConfigScope } from "../scanner/types.js";

/**
 * A single MCP server extracted from configuration.
 */
export interface McpServer {
  /** Server key name (e.g., "context7", "github") */
  name: string;
  /** Which scope it was found in */
  scope: ConfigScope;
  /** Absolute path to the source file */
  sourcePath: string;
  /** Server type determined from config structure */
  type: "command" | "http";
  /** Command to execute (for command-based servers) */
  command?: string;
  /** Command arguments (for command-based servers) */
  args?: string[];
  /** HTTP endpoint URL (for http-based servers) */
  url?: string;
  /** HTTP headers with secrets masked (for http-based servers) */
  headers?: Record<string, string>;
  /** Environment variables with values masked */
  env?: Record<string, string>;
  /**
   * True if this server name appears in more than one config file.
   * Only set after duplicate detection in extractMcpServers().
   */
  isDuplicate?: boolean;
  /**
   * True if this is the highest-priority instance of a duplicated server
   * (project beats local beats user beats managed).
   * False means it is shadowed by a higher-priority entry.
   * Undefined for non-duplicate servers.
   */
  isActive?: boolean;
}

/**
 * A server name that appears in multiple scope/file locations.
 */
export interface McpDuplicate {
  /** The duplicated server name */
  name: string;
  /** All locations where this server name was found */
  locations: Array<{ scope: ConfigScope; sourcePath: string }>;
}

/**
 * The complete result of MCP server extraction.
 */
export interface McpResult {
  /** All discovered MCP servers across all scopes */
  servers: McpServer[];
  /** Server names that appear in multiple files */
  duplicates: McpDuplicate[];
}
