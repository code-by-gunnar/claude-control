import type { ConfigFile, ScanResult } from "../scanner/types.js";
import type { HealthCheck, HealthCategory, HealthResult } from "./types.js";

/**
 * Category weight percentages for overall score calculation.
 * Memory: 30%, Settings: 25%, MCP: 20%, Hooks: 15%, Permissions: 10%
 */
const CATEGORY_WEIGHTS: Record<string, number> = {
  Memory: 0.3,
  Settings: 0.25,
  MCP: 0.2,
  Hooks: 0.15,
  Permissions: 0.1,
};

/**
 * Determine letter grade from a numeric score.
 */
function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

/**
 * Generate a one-sentence summary based on the grade.
 */
function summaryFromGrade(grade: string): string {
  switch (grade) {
    case "A":
      return "Excellent setup — your Claude Code configuration is comprehensive.";
    case "B":
      return "Good setup — a few improvements would make it even better.";
    case "C":
      return "Decent setup — consider adding recommended configuration for a better experience.";
    case "D":
      return "Basic setup — several important configuration files are missing.";
    default:
      return "Minimal setup — most recommended configuration is missing.";
  }
}

/**
 * Compute the score for a single category from its checks.
 *
 * Score = (sum of passed check weights / sum of all check weights) * 100
 */
function computeCategoryScore(checks: HealthCheck[]): number {
  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  const passedWeight = checks
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + c.weight, 0);

  return Math.round((passedWeight / totalWeight) * 100);
}

/**
 * Check if any file matching the given criteria exists in the scan result files.
 */
function hasFile(
  files: ConfigFile[],
  type: string,
  scope?: string
): boolean {
  return files.some(
    (f) =>
      f.type === type &&
      f.exists &&
      (scope === undefined || f.scope === scope)
  );
}

/**
 * Check if any settings file contains a specific top-level key with entries.
 */
function hasSettingsKey(files: ConfigFile[], key: string): boolean {
  return files.some((f) => {
    if (
      f.type !== "settings" ||
      !f.exists ||
      !f.readable ||
      f.content === undefined ||
      f.content === null ||
      typeof f.content !== "object"
    ) {
      return false;
    }
    const content = f.content as Record<string, unknown>;
    const value = content[key];
    if (value === undefined || value === null) return false;
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value as object).length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  });
}

/**
 * Run all Memory category checks.
 */
function checkMemory(files: ConfigFile[]): HealthCheck[] {
  return [
    {
      id: "has-project-claude-md",
      label: "Project CLAUDE.md",
      category: "Memory",
      passed: hasFile(files, "claude-md", "project"),
      weight: 3,
      recommendation:
        "Create a CLAUDE.md in your project root to give Claude project-specific context.",
    },
    {
      id: "has-user-claude-md",
      label: "User CLAUDE.md",
      category: "Memory",
      passed: hasFile(files, "claude-md", "user"),
      weight: 1,
      recommendation:
        "Create ~/.claude/CLAUDE.md with global instructions that apply to all projects.",
    },
  ];
}

/**
 * Run all Settings category checks.
 */
function checkSettings(files: ConfigFile[]): HealthCheck[] {
  return [
    {
      id: "has-project-settings",
      label: "Project settings.json",
      category: "Settings",
      passed: hasFile(files, "settings", "project"),
      weight: 2,
      recommendation:
        "Create .claude/settings.json in your project for project-specific configuration.",
    },
    {
      id: "has-user-settings",
      label: "User settings.json",
      category: "Settings",
      passed: hasFile(files, "settings", "user"),
      weight: 1,
      recommendation:
        "Create ~/.claude/settings.json with your global preferences.",
    },
  ];
}

/**
 * Run all MCP category checks.
 */
function checkMcp(files: ConfigFile[]): HealthCheck[] {
  return [
    {
      id: "has-mcp-server",
      label: "At least one MCP server configured",
      category: "MCP",
      passed: hasFile(files, "mcp"),
      weight: 2,
      recommendation:
        "Configure MCP servers in .mcp.json to extend Claude's capabilities.",
    },
    {
      id: "has-project-mcp",
      label: "Project .mcp.json",
      category: "MCP",
      passed: hasFile(files, "mcp", "project"),
      weight: 1,
      recommendation:
        "Create .mcp.json in your project root for project-specific MCP servers.",
    },
  ];
}

/**
 * Run all Hooks category checks.
 */
function checkHooks(files: ConfigFile[]): HealthCheck[] {
  return [
    {
      id: "has-hooks",
      label: "At least one hook configured",
      category: "Hooks",
      passed: hasSettingsKey(files, "hooks"),
      weight: 1,
      recommendation:
        "Configure hooks in settings.json to automate actions on Claude events.",
    },
    {
      id: "has-commands-dir",
      label: "Custom commands directory",
      category: "Hooks",
      passed: hasFile(files, "commands-dir"),
      weight: 1,
      recommendation:
        "Create a .claude/commands/ directory with .md files to define custom slash commands.",
    },
  ];
}

/**
 * Run all Permissions category checks.
 */
function checkPermissions(files: ConfigFile[]): HealthCheck[] {
  return [
    {
      id: "has-permissions",
      label: "Permissions configured",
      category: "Permissions",
      passed: hasSettingsKey(files, "permissions"),
      weight: 1,
      recommendation:
        "Configure permissions in settings.json to control which tools Claude can use.",
    },
  ];
}

/**
 * Compute a health/completeness score for a Claude Code project configuration.
 *
 * Evaluates the scan result against recommended practices across 5 categories:
 * Memory (30%), Settings (25%), MCP (20%), Hooks (15%), Permissions (10%).
 *
 * Each category contains weighted checks. The overall score is a weighted average
 * of category scores. A letter grade and actionable recommendations are provided.
 *
 * @param scanResult - The complete scan result from scan()
 * @returns HealthResult with score, grade, categories, and recommendations
 */
export function computeHealth(scanResult: ScanResult): HealthResult {
  const { files } = scanResult;

  // Run all category checks
  const categoryChecks: Record<string, HealthCheck[]> = {
    Memory: checkMemory(files),
    Settings: checkSettings(files),
    MCP: checkMcp(files),
    Hooks: checkHooks(files),
    Permissions: checkPermissions(files),
  };

  // Build category results
  const categories: HealthCategory[] = Object.entries(categoryChecks).map(
    ([name, checks]) => ({
      name,
      score: computeCategoryScore(checks),
      maxScore: 100,
      checks,
    })
  );

  // Compute overall weighted score
  const overallScore = Math.round(
    categories.reduce((sum, cat) => {
      const weight = CATEGORY_WEIGHTS[cat.name] ?? 0;
      return sum + cat.score * weight;
    }, 0)
  );

  const grade = gradeFromScore(overallScore);
  const summary = summaryFromGrade(grade);

  // Collect recommendations from failed checks, sorted by weight (highest first)
  const recommendations = categories
    .flatMap((cat) => cat.checks)
    .filter((check) => !check.passed && check.recommendation)
    .sort((a, b) => b.weight - a.weight)
    .map((check) => check.recommendation!);

  return {
    overallScore,
    grade,
    categories,
    recommendations,
    summary,
  };
}
