import type { CommandEntry } from "../hooks/types.js";
import type {
  FindingSeverity,
  ScanRule,
  SkillFinding,
  SkillScanEntry,
  SkillScanResult,
  SkillScanSummary,
} from "./types.js";
import { SCAN_RULES } from "./rules.js";

/** Severity ordering for sorting (higher index = more severe). */
const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * Scan a skill's content against a set of rules.
 *
 * Pure function — no file I/O. Splits content into lines and tests
 * each rule against each line. Multiline rules test against the full
 * content string.
 *
 * @param content - The full text content of the skill file
 * @param rules - Array of scan rules to check
 * @returns Array of findings sorted by severity (most severe first)
 */
export function scanSkillContent(
  content: string,
  rules: ScanRule[]
): SkillFinding[] {
  if (!content) return [];

  const findings: SkillFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (const rule of rules) {
    if (rule.multiline) {
      // Test against full content
      if (rule.pattern.test(content)) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          message: rule.message,
        });
      }
    } else {
      // Test line by line
      for (let i = 0; i < lines.length; i++) {
        if (rule.pattern.test(lines[i])) {
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: rule.message,
            line: i + 1,
            snippet:
              lines[i].length > 120
                ? lines[i].slice(0, 120) + "..."
                : lines[i],
          });
          // Only report first match per rule per file to avoid noise
          break;
        }
      }
    }
  }

  // Sort by severity descending
  findings.sort(
    (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
  );

  return findings;
}

/**
 * Determine the overall status of a scan entry based on its highest
 * severity finding.
 */
function computeStatus(
  findings: SkillFinding[]
): SkillScanEntry["status"] {
  if (findings.length === 0) return "clean";

  const maxSeverity = Math.max(
    ...findings.map((f) => SEVERITY_ORDER[f.severity])
  );

  if (maxSeverity >= SEVERITY_ORDER.high) return "danger";
  if (maxSeverity >= SEVERITY_ORDER.medium) return "warning";
  return "info";
}

/**
 * Scan all skills/commands for security issues.
 *
 * Filters to entries that have content, runs the scanner on each,
 * and computes summary counts.
 *
 * @param commands - Array of CommandEntry from extractCommands()
 * @param rules - Optional custom rules (defaults to SCAN_RULES)
 * @returns Complete scan result with entries and summary
 */
export function scanAllSkills(
  commands: CommandEntry[],
  rules: ScanRule[] = SCAN_RULES
): SkillScanResult {
  const entries: SkillScanEntry[] = [];

  for (const cmd of commands) {
    if (!cmd.content) continue;

    const findings = scanSkillContent(cmd.content, rules);
    const status = computeStatus(findings);

    entries.push({
      name: cmd.name,
      path: cmd.path,
      scope: cmd.scope,
      source: cmd.source,
      findings,
      status,
    });
  }

  const summary: SkillScanSummary = {
    total: entries.length,
    clean: entries.filter((e) => e.status === "clean").length,
    info: entries.filter((e) => e.status === "info").length,
    warning: entries.filter((e) => e.status === "warning").length,
    danger: entries.filter((e) => e.status === "danger").length,
  };

  return { entries, summary };
}
