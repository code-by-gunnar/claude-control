import path from "node:path";
import { describe, it, expect } from "vitest";
import { getConfigPaths, getGlobalClaudeDir } from "./paths.js";

describe("getGlobalClaudeDir", () => {
  it("returns a path ending with .claude", () => {
    const dir = getGlobalClaudeDir();
    expect(dir).toMatch(/\.claude$/);
  });

  it("returns an absolute path", () => {
    const dir = getGlobalClaudeDir();
    // Absolute paths start with / on Unix or drive letter on Windows
    expect(dir).toMatch(/^(\/|[A-Z]:\\)/i);
  });
});

describe("getConfigPaths", () => {
  describe("without projectDir", () => {
    it("returns only global/user-scope and managed entries", () => {
      const paths = getConfigPaths();
      const scopes = new Set(paths.map((p) => p.scope));

      expect(scopes.has("managed")).toBe(true);
      expect(scopes.has("user")).toBe(true);
      expect(scopes.has("project")).toBe(false);
      expect(scopes.has("local")).toBe(false);
    });

    it("includes managed settings", () => {
      const paths = getConfigPaths();
      const managed = paths.filter((p) => p.scope === "managed");

      expect(managed).toHaveLength(1);
      expect(managed[0].type).toBe("settings");
    });

    it("includes user settings, credentials, keybindings, claude-md, and commands-dir", () => {
      const paths = getConfigPaths();
      const userTypes = paths
        .filter((p) => p.scope === "user")
        .map((p) => p.type)
        .sort();

      expect(userTypes).toEqual([
        "claude-md",
        "commands-dir",
        "credentials",
        "keybindings",
        "settings",
      ]);
    });

    it("returns 6 total entries without projectDir", () => {
      const paths = getConfigPaths();
      // 1 managed + 5 user
      expect(paths).toHaveLength(6);
    });

    it("user paths contain .claude directory segment", () => {
      const paths = getConfigPaths();
      const userPaths = paths.filter((p) => p.scope === "user");

      for (const p of userPaths) {
        expect(p.expectedPath).toContain(".claude");
      }
    });
  });

  describe("with projectDir", () => {
    // Use path.join to normalize separators for the current platform
    const projectDir = path.join("/home", "user", "my-project");

    it("returns global + project-scope entries", () => {
      const paths = getConfigPaths(projectDir);
      const scopes = new Set(paths.map((p) => p.scope));

      expect(scopes.has("managed")).toBe(true);
      expect(scopes.has("user")).toBe(true);
      expect(scopes.has("project")).toBe(true);
      expect(scopes.has("local")).toBe(true);
    });

    it("returns 12 total entries with projectDir", () => {
      const paths = getConfigPaths(projectDir);
      // 1 managed + 5 user + 6 project/local
      expect(paths).toHaveLength(12);
    });

    it("project-scope paths contain the projectDir", () => {
      const paths = getConfigPaths(projectDir);
      const projectPaths = paths.filter(
        (p) => p.scope === "project" || p.scope === "local",
      );

      for (const p of projectPaths) {
        expect(p.expectedPath).toContain(projectDir);
      }
    });

    it("includes project and local settings", () => {
      const paths = getConfigPaths(projectDir);

      const projectSettings = paths.find(
        (p) => p.scope === "project" && p.type === "settings",
      );
      expect(projectSettings).toBeDefined();
      expect(projectSettings!.expectedPath).toContain("settings.json");

      const localSettings = paths.find(
        (p) => p.scope === "local" && p.type === "settings",
      );
      expect(localSettings).toBeDefined();
      expect(localSettings!.expectedPath).toContain("settings.local.json");
    });

    it("includes project CLAUDE.md files", () => {
      const paths = getConfigPaths(projectDir);
      const claudeMds = paths.filter(
        (p) => p.scope === "project" && p.type === "claude-md",
      );

      // Two project CLAUDE.md: root and .claude/ directory
      expect(claudeMds).toHaveLength(2);
    });

    it("includes project commands-dir", () => {
      const paths = getConfigPaths(projectDir);
      const commandsDirs = paths.filter(
        (p) => p.scope === "project" && p.type === "commands-dir",
      );

      expect(commandsDirs).toHaveLength(1);
      expect(commandsDirs[0].expectedPath).toContain("commands");
    });

    it("includes project .mcp.json", () => {
      const paths = getConfigPaths(projectDir);
      const mcp = paths.find(
        (p) => p.scope === "project" && p.type === "mcp",
      );

      expect(mcp).toBeDefined();
      expect(mcp!.expectedPath).toContain(".mcp.json");
    });
  });
});
