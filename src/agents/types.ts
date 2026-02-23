/**
 * Information about a single agent persona file.
 */
export interface AgentInfo {
  /** Agent name from frontmatter or derived from filename */
  name: string;
  /** Filename (e.g., "code-reviewer.md") */
  fileName: string;
  /** Absolute path to the agent file */
  path: string;
  /** Description from frontmatter */
  description: string | null;
  /** Color from frontmatter */
  color: string | null;
  /** Tools from frontmatter (parsed from comma-separated list) */
  tools: string[];
  /** Model from frontmatter */
  model: string | null;
  /** File size in bytes */
  sizeBytes: number;
  /** Full markdown content of the agent file */
  content: string;
}

/**
 * The complete result of agent discovery.
 */
export interface AgentsResult {
  /** All discovered agent files */
  agents: AgentInfo[];
  /** Total number of agents found */
  totalCount: number;
  /** The directory path that was scanned */
  agentsDir: string;
}
