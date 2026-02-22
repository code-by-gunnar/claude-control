import { describe, it, expect } from "vitest";
import { computeHealth } from "./resolver.js";
import type { ScanResult, ConfigFile } from "../scanner/types.js";

/**
 * Helper to create a mock ConfigFile.
 */
function makeFile(
  type: ConfigFile["type"],
  scope: ConfigFile["scope"],
  opts?: {
    exists?: boolean;
    readable?: boolean;
    content?: unknown;
  },
): ConfigFile {
  const exists = opts?.exists ?? true;
  return {
    scope,
    type,
    expectedPath: `/mock/${scope}/${type}`,
    description: `${scope} ${type}`,
    exists,
    readable: opts?.readable ?? exists,
    content: opts?.content,
  };
}

/**
 * Helper to create a mock ScanResult from a list of files.
 */
function makeScanResult(files: ConfigFile[]): ScanResult {
  return {
    timestamp: new Date().toISOString(),
    projectDir: "/mock/project",
    globalDir: "/mock/.claude",
    files,
    summary: {
      total: files.length,
      found: files.filter((f) => f.exists).length,
      missing: files.filter((f) => !f.exists).length,
      errors: files.filter((f) => f.exists && !!f.error).length,
    },
  };
}

describe("computeHealth", () => {
  it("returns valid result for empty scan (no files)", () => {
    const result = computeHealth(makeScanResult([]));

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.grade).toBe("F");
    expect(result.categories).toHaveLength(5);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();
  });

  it("returns high score when all config files are present", () => {
    const files: ConfigFile[] = [
      // Memory
      makeFile("claude-md", "project"),
      makeFile("claude-md", "user"),
      // Settings
      makeFile("settings", "project"),
      makeFile("settings", "user"),
      // MCP
      makeFile("mcp", "project"),
      // Hooks (via settings with hooks key)
      makeFile("settings", "local", {
        content: { hooks: { onSave: "lint" } },
      }),
      // Commands dir
      makeFile("commands-dir", "project"),
      // Permissions (via settings with permissions key)
      makeFile("settings", "project", {
        content: { permissions: { allow: ["Bash"] } },
      }),
    ];

    const result = computeHealth(makeScanResult(files));

    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("A");
    expect(result.recommendations).toHaveLength(0);
  });

  it("returns lower score with minimal config", () => {
    const files: ConfigFile[] = [
      makeFile("settings", "user"),
    ];

    const result = computeHealth(makeScanResult(files));

    expect(result.overallScore).toBeLessThan(90);
    expect(result.grade).not.toBe("A");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("correctly identifies grade A threshold (90+)", () => {
    // Provide everything to get full score
    const files: ConfigFile[] = [
      makeFile("claude-md", "project"),
      makeFile("claude-md", "user"),
      makeFile("settings", "project"),
      makeFile("settings", "user"),
      makeFile("mcp", "project"),
      makeFile("settings", "local", {
        content: { hooks: { onSave: "lint" } },
      }),
      makeFile("commands-dir", "user"),
      makeFile("settings", "project", {
        content: { permissions: { allow: ["Bash"] } },
      }),
    ];

    const result = computeHealth(makeScanResult(files));
    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("A");
  });

  it("correctly identifies grade F threshold (<40)", () => {
    const result = computeHealth(makeScanResult([]));
    expect(result.overallScore).toBeLessThan(40);
    expect(result.grade).toBe("F");
  });

  it("has five categories with correct names", () => {
    const result = computeHealth(makeScanResult([]));

    const names = result.categories.map((c) => c.name);
    expect(names).toEqual(["Memory", "Settings", "MCP", "Hooks", "Permissions"]);
  });

  it("category weights sum to 100%", () => {
    // The weights are internal, but we can verify via score computation
    // by checking that a fully passing result gives ~100
    const files: ConfigFile[] = [
      makeFile("claude-md", "project"),
      makeFile("claude-md", "user"),
      makeFile("settings", "project"),
      makeFile("settings", "user"),
      makeFile("mcp", "project"),
      makeFile("settings", "local", {
        content: { hooks: { onSave: "lint" } },
      }),
      makeFile("commands-dir", "user"),
      makeFile("settings", "project", {
        content: { permissions: { allow: ["Bash"] } },
      }),
    ];

    const result = computeHealth(makeScanResult(files));
    // All checks pass -> each category 100 -> weighted sum = 100
    expect(result.overallScore).toBe(100);
  });

  it("generates recommendations for missing config", () => {
    // Only provide user settings — everything else missing
    const files: ConfigFile[] = [
      makeFile("settings", "user"),
    ];

    const result = computeHealth(makeScanResult(files));

    // Should have recommendations for missing items
    expect(result.recommendations.length).toBeGreaterThan(0);

    // Recommendations should be strings with actionable text
    for (const rec of result.recommendations) {
      expect(typeof rec).toBe("string");
      expect(rec.length).toBeGreaterThan(10);
    }
  });

  it("recommendations are sorted by weight (highest first)", () => {
    // Provide nothing — all checks fail, recommendations sorted by weight
    const result = computeHealth(makeScanResult([]));

    // The project CLAUDE.md check (weight 3) should come before weight-1 checks
    // First recommendation should be about the highest-weight missing item
    expect(result.recommendations[0]).toContain("CLAUDE.md");
  });

  it("category scores are between 0 and 100", () => {
    const result = computeHealth(makeScanResult([]));

    for (const cat of result.categories) {
      expect(cat.score).toBeGreaterThanOrEqual(0);
      expect(cat.score).toBeLessThanOrEqual(100);
      expect(cat.maxScore).toBe(100);
    }
  });

  it("each category has checks with expected fields", () => {
    const result = computeHealth(makeScanResult([]));

    for (const cat of result.categories) {
      expect(cat.checks.length).toBeGreaterThan(0);
      for (const check of cat.checks) {
        expect(check).toHaveProperty("id");
        expect(check).toHaveProperty("label");
        expect(check).toHaveProperty("category");
        expect(check).toHaveProperty("passed");
        expect(check).toHaveProperty("weight");
        expect(check.category).toBe(cat.name);
      }
    }
  });
});
