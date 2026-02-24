import type { ConfigScope } from "../scanner/types.js";

/**
 * Severity levels for skill scan findings.
 *
 * - critical: Active exploit attempts (exfiltrate env vars, modify system files)
 * - high: Dangerous patterns (shell execution, hidden instructions)
 * - medium: Suspicious patterns worth reviewing (encoded content, broad tool access)
 * - low: Best-practice suggestions (large files, no frontmatter)
 */
export type FindingSeverity = "critical" | "high" | "medium" | "low";

/**
 * A single scan rule definition.
 */
export interface ScanRule {
  /** Unique rule identifier (e.g., "exfil-curl-secrets") */
  id: string;
  /** Severity level */
  severity: FindingSeverity;
  /** Human-readable description of what this rule detects */
  message: string;
  /** Regex pattern to test against each line (or full content for multiline) */
  pattern: RegExp;
  /** If true, test against the full content instead of line-by-line */
  multiline?: boolean;
}

/**
 * A single finding from scanning a skill's content.
 */
export interface SkillFinding {
  /** Rule ID that triggered this finding */
  ruleId: string;
  /** Severity level */
  severity: FindingSeverity;
  /** Human-readable message */
  message: string;
  /** Line number where the pattern was found (1-based), if available */
  line?: number;
  /** Snippet of the matching line */
  snippet?: string;
}

/**
 * Scan result for a single skill/command entry.
 */
export interface SkillScanEntry {
  /** Skill/command name */
  name: string;
  /** Absolute file path */
  path: string;
  /** Config scope */
  scope: ConfigScope;
  /** Source type */
  source?: "command" | "skill" | "plugin";
  /** All findings for this entry */
  findings: SkillFinding[];
  /** Overall status based on highest severity finding */
  status: "clean" | "info" | "warning" | "danger";
}

/**
 * Summary counts for the full scan.
 */
export interface SkillScanSummary {
  total: number;
  clean: number;
  info: number;
  warning: number;
  danger: number;
}

/**
 * Complete result of scanning all skills/commands.
 */
export interface SkillScanResult {
  entries: SkillScanEntry[];
  summary: SkillScanSummary;
}
