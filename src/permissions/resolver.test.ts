import { describe, it, expect } from "vitest";
import { resolvePermissions } from "./resolver.js";
import type { ConfigFile } from "../scanner/types.js";

/**
 * Helper to create a mock ConfigFile with permissions content.
 */
function makeSettingsFile(
  scope: ConfigFile["scope"],
  permissions: Record<string, string[]>,
  sourcePath?: string,
): ConfigFile {
  return {
    scope,
    type: "settings",
    expectedPath: sourcePath ?? `/mock/${scope}/settings.json`,
    description: `${scope} settings`,
    exists: true,
    readable: true,
    content: { permissions },
  };
}

describe("resolvePermissions", () => {
  it("returns empty result for empty files array", () => {
    const result = resolvePermissions([]);

    expect(result.all).toEqual([]);
    expect(result.effective).toEqual([]);
  });

  it("extracts permissions from a single scope", () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        allow: ["Bash", "Read"],
        deny: ["WebSearch"],
      }),
    ];

    const result = resolvePermissions(files);

    expect(result.all).toHaveLength(3);
    expect(result.effective).toHaveLength(3);

    const bash = result.effective.find((p) => p.tool === "Bash");
    expect(bash).toBeDefined();
    expect(bash!.effectiveRule).toBe("allow");
    expect(bash!.effectiveScope).toBe("user");

    const webSearch = result.effective.find((p) => p.tool === "WebSearch");
    expect(webSearch).toBeDefined();
    expect(webSearch!.effectiveRule).toBe("deny");
  });

  it("deny always wins regardless of scope", () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", { deny: ["Bash"] }),
      makeSettingsFile("local", { allow: ["Bash"] }),
    ];

    const result = resolvePermissions(files);

    expect(result.effective).toHaveLength(1);
    const bash = result.effective[0];
    expect(bash.tool).toBe("Bash");
    expect(bash.effectiveRule).toBe("deny");
    // deny from user scope wins over allow from local scope
    expect(bash.effectiveScope).toBe("user");
  });

  it("deny from lower scope wins over allow from higher scope", () => {
    const files: ConfigFile[] = [
      makeSettingsFile("managed", { deny: ["WebSearch"] }),
      makeSettingsFile("project", { allow: ["WebSearch"] }),
      makeSettingsFile("local", { allow: ["WebSearch"] }),
    ];

    const result = resolvePermissions(files);

    const ws = result.effective.find((p) => p.tool === "WebSearch");
    expect(ws).toBeDefined();
    expect(ws!.effectiveRule).toBe("deny");
    expect(ws!.effectiveScope).toBe("managed");
  });

  it("ask beats allow at same rule priority level", () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", { allow: ["Bash"] }),
      makeSettingsFile("project", { ask: ["Bash"] }),
    ];

    const result = resolvePermissions(files);

    const bash = result.effective[0];
    expect(bash.effectiveRule).toBe("ask");
    expect(bash.effectiveScope).toBe("project");
  });

  it("higher scope wins when same rule type", () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", { allow: ["Bash"] }, "/home/.claude/settings.json"),
      makeSettingsFile("local", { allow: ["Bash"] }, "/proj/.claude/settings.local.json"),
    ];

    const result = resolvePermissions(files);

    const bash = result.effective[0];
    expect(bash.effectiveRule).toBe("allow");
    // local has higher scope priority than user
    expect(bash.effectiveScope).toBe("local");
    expect(bash.effectiveSourcePath).toBe("/proj/.claude/settings.local.json");
  });

  it("resolves different tools independently", () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        allow: ["Bash"],
        deny: ["WebSearch"],
        ask: ["Edit"],
      }),
    ];

    const result = resolvePermissions(files);

    expect(result.effective).toHaveLength(3);

    const bash = result.effective.find((p) => p.tool === "Bash");
    expect(bash!.effectiveRule).toBe("allow");

    const webSearch = result.effective.find((p) => p.tool === "WebSearch");
    expect(webSearch!.effectiveRule).toBe("deny");

    const edit = result.effective.find((p) => p.tool === "Edit");
    expect(edit!.effectiveRule).toBe("ask");
  });

  it("tracks origin scope for each resolved permission", () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", { allow: ["Bash"] }, "/home/.claude/settings.json"),
      makeSettingsFile("project", { ask: ["Bash"] }, "/proj/.claude/settings.json"),
    ];

    const result = resolvePermissions(files);

    const bash = result.effective[0];
    expect(bash.effectiveScope).toBe("project");
    expect(bash.effectiveSourcePath).toBe("/proj/.claude/settings.json");
    expect(bash.overrides).toHaveLength(2);
  });

  it("skips non-settings files", () => {
    const files: ConfigFile[] = [
      {
        scope: "user",
        type: "claude-md",
        expectedPath: "/home/.claude/CLAUDE.md",
        description: "Memory file",
        exists: true,
        readable: true,
        content: "# Some content",
      },
      makeSettingsFile("user", { allow: ["Bash"] }),
    ];

    const result = resolvePermissions(files);

    expect(result.effective).toHaveLength(1);
    expect(result.effective[0].tool).toBe("Bash");
  });

  it("skips files that are missing or unreadable", () => {
    const files: ConfigFile[] = [
      {
        scope: "user",
        type: "settings",
        expectedPath: "/home/.claude/settings.json",
        description: "User settings",
        exists: false,
        readable: false,
        content: undefined,
      },
      makeSettingsFile("project", { allow: ["Bash"] }),
    ];

    const result = resolvePermissions(files);

    expect(result.effective).toHaveLength(1);
    expect(result.effective[0].effectiveScope).toBe("project");
  });

  it("handles permissions with patterns", () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        allow: ["Bash(ls *)"],
        deny: ["Bash(rm -rf *)"],
      }),
    ];

    const result = resolvePermissions(files);

    expect(result.effective).toHaveLength(2);

    const allowBash = result.effective.find(
      (p) => p.tool === "Bash" && p.pattern === "ls *",
    );
    expect(allowBash).toBeDefined();
    expect(allowBash!.effectiveRule).toBe("allow");

    const denyBash = result.effective.find(
      (p) => p.tool === "Bash" && p.pattern === "rm -rf *",
    );
    expect(denyBash).toBeDefined();
    expect(denyBash!.effectiveRule).toBe("deny");
  });
});
