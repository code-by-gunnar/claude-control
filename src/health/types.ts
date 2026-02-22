/**
 * A single health check evaluating one aspect of Claude Code configuration.
 */
export interface HealthCheck {
  /** Unique identifier (e.g., "has-project-claude-md") */
  id: string;
  /** Human-readable label (e.g., "Project CLAUDE.md") */
  label: string;
  /** Category this check belongs to */
  category: string;
  /** Whether the check passed */
  passed: boolean;
  /** Importance weight (1-3, higher = more important) */
  weight: number;
  /** Actionable recommendation shown when check fails */
  recommendation?: string;
}

/**
 * A group of related health checks with an aggregated score.
 */
export interface HealthCategory {
  /** Category name (e.g., "Memory", "Settings") */
  name: string;
  /** Computed score for this category (0-100) */
  score: number;
  /** Maximum possible score (always 100 for display consistency) */
  maxScore: number;
  /** Individual checks in this category */
  checks: HealthCheck[];
}

/**
 * The complete health assessment result for a project's Claude Code setup.
 */
export interface HealthResult {
  /** Overall health score (0-100) */
  overallScore: number;
  /** Letter grade: A (90+), B (75-89), C (60-74), D (40-59), F (<40) */
  grade: string;
  /** Per-category breakdown */
  categories: HealthCategory[];
  /** Top actionable recommendations sorted by importance */
  recommendations: string[];
  /** One-sentence summary based on grade */
  summary: string;
}
