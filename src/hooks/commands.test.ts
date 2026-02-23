import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseFrontmatter, extractCommands } from "./resolver.js";
import type { ConfigFile } from "../scanner/types.js";

// Mock fs for extractCommands
vi.mock("node:fs/promises", () => ({
  default: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    stat: vi.fn(),
  },
}));

vi.mock("../scanner/paths.js", () => ({
  getGlobalClaudeDir: vi.fn(() => "/home/user/.claude"),
}));

import fs from "node:fs/promises";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("parseFrontmatter (commands)", () => {
  it("returns empty object when no frontmatter present", () => {
    expect(parseFrontmatter("# Just markdown\nContent here")).toEqual({});
  });

  it("extracts basic key-value pairs", () => {
    const content = "---\nname: my-command\ndescription: Does things\n---\n# Body";
    const result = parseFrontmatter(content);
    expect(result.name).toBe("my-command");
    expect(result.description).toBe("Does things");
  });

  it("strips double-quoted values", () => {
    const content = '---\nname: "quoted-name"\n---\n';
    expect(parseFrontmatter(content).name).toBe("quoted-name");
  });

  it("strips single-quoted values", () => {
    const content = "---\nname: 'single-quoted'\n---\n";
    expect(parseFrontmatter(content).name).toBe("single-quoted");
  });

  it("handles CRLF line endings", () => {
    const content = "---\r\nname: command\r\ndescription: test\r\n---\r\n";
    const result = parseFrontmatter(content);
    expect(result.name).toBe("command");
    expect(result.description).toBe("test");
  });

  it("skips lines without a colon", () => {
    const content = "---\nname: valid\njust-text\n---\n";
    const result = parseFrontmatter(content);
    expect(result.name).toBe("valid");
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("skips entries with empty value after colon", () => {
    const content = "---\nname: valid\nempty:\n---\n";
    const result = parseFrontmatter(content);
    expect(result.name).toBe("valid");
    expect(result).not.toHaveProperty("empty");
  });
});

describe("extractCommands", () => {
  /**
   * Helper: create a commands-dir ConfigFile.
   */
  function makeCommandsDir(
    scope: ConfigFile["scope"],
    dirPath: string,
  ): ConfigFile {
    return {
      scope,
      type: "commands-dir",
      expectedPath: dirPath,
      description: `${scope} commands dir`,
      exists: true,
      readable: true,
    };
  }

  /**
   * Helper: create a skills-dir ConfigFile.
   */
  function makeSkillsDir(
    scope: ConfigFile["scope"],
    dirPath: string,
  ): ConfigFile {
    return {
      scope,
      type: "skills-dir",
      expectedPath: dirPath,
      description: `${scope} skills dir`,
      exists: true,
      readable: true,
    };
  }

  it("returns empty result when no command/skill dirs", async () => {
    const result = await extractCommands([]);
    expect(result.commands).toEqual([]);
  });

  it("discovers direct .md files from commands-dir", async () => {
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "deploy.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("---\ndescription: Deploy cmd\n---\n# Deploy");
    vi.mocked(fs.stat).mockResolvedValue({ size: 50 } as any);

    const files = [makeCommandsDir("user", "/home/user/.claude/commands")];
    const result = await extractCommands(files);

    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].name).toBe("deploy");
    expect(result.commands[0].source).toBe("command");
    expect(result.commands[0].scope).toBe("user");
    expect(result.commands[0].description).toBe("Deploy cmd");
    expect(result.commands[0].sizeBytes).toBe(50);
  });

  it("handles subdirectory namespacing (e.g., gsd:add-phase)", async () => {
    // First readdir: commands-dir root
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "gsd", isFile: () => false, isDirectory: () => true },
    ] as any);
    // Second readdir: inside gsd/
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "add-phase.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("---\ndescription: Add phase\n---\n");
    vi.mocked(fs.stat).mockResolvedValue({ size: 30 } as any);

    const files = [makeCommandsDir("user", "/home/user/.claude/commands")];
    const result = await extractCommands(files);

    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].name).toBe("gsd:add-phase");
  });

  it("discovers skills from skills-dir subdirectories", async () => {
    // readdir for skills-dir root
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "my-skill", isFile: () => false, isDirectory: () => true },
    ] as any);
    // readdir inside my-skill/
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "SKILL.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("---\ndescription: My skill\n---\n# Skill");
    vi.mocked(fs.stat).mockResolvedValue({ size: 40 } as any);

    const files = [makeSkillsDir("user", "/home/user/.claude/skills")];
    const result = await extractCommands(files);

    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].name).toBe("my-skill");
    expect(result.commands[0].source).toBe("skill");
  });

  it("extracts frontmatter description into entry", async () => {
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "test.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("---\ndescription: A test command\n---\n# Test");
    vi.mocked(fs.stat).mockResolvedValue({ size: 50 } as any);

    const files = [makeCommandsDir("project", "/proj/.claude/commands")];
    const result = await extractCommands(files);

    expect(result.commands[0].description).toBe("A test command");
  });

  it("sets source field correctly for commands and skills", async () => {
    // Commands dir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "cmd.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    // Skills dir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "skill-name", isFile: () => false, isDirectory: () => true },
    ] as any);
    // Inside skill dir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "SKILL.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("# content");
    vi.mocked(fs.stat).mockResolvedValue({ size: 10 } as any);

    const files = [
      makeCommandsDir("user", "/home/user/.claude/commands"),
      makeSkillsDir("user", "/home/user/.claude/skills"),
    ];
    const result = await extractCommands(files);

    const cmd = result.commands.find((c) => c.name === "cmd");
    const skill = result.commands.find((c) => c.name === "skill-name");
    expect(cmd!.source).toBe("command");
    expect(skill!.source).toBe("skill");
  });

  it("sorts by scope priority then alphabetically", async () => {
    // Project commands dir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "z-cmd.md", isFile: () => true, isDirectory: () => false },
      { name: "a-cmd.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    // User commands dir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "m-cmd.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("# content");
    vi.mocked(fs.stat).mockResolvedValue({ size: 10 } as any);

    const files = [
      makeCommandsDir("project", "/proj/.claude/commands"),
      makeCommandsDir("user", "/home/user/.claude/commands"),
    ];
    const result = await extractCommands(files);

    // project scope (priority 0) comes before user (priority 2)
    expect(result.commands[0].name).toBe("a-cmd");
    expect(result.commands[0].scope).toBe("project");
    expect(result.commands[1].name).toBe("z-cmd");
    expect(result.commands[1].scope).toBe("project");
    expect(result.commands[2].name).toBe("m-cmd");
    expect(result.commands[2].scope).toBe("user");
  });

  it("discovers plugin commands and skills", async () => {
    // No non-plugin dirs
    // Plugin commands dir readdir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "run.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    // Plugin skills dir readdir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "my-skill", isFile: () => false, isDirectory: () => true },
    ] as any);
    // Inside plugin skill
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "SKILL.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("# content");
    vi.mocked(fs.stat).mockResolvedValue({ size: 10 } as any);

    const plugins = [
      {
        name: "superpowers",
        installed: true,
        enabled: true,
        pluginDir: "/home/user/.claude/plugins/marketplaces/official/external_plugins/superpowers",
        scope: "user" as const,
        marketplace: "official",
        key: "superpowers@official",
        sourcePath: "/mock/settings.json",
        mcpServers: [],
        version: null,
        installedAt: null,
        lastUpdated: null,
        pluginType: "skills" as const,
        description: null,
        installPath: null,
      },
    ];

    const result = await extractCommands([], plugins);

    const pluginCommands = result.commands.filter((c) => c.source === "plugin");
    expect(pluginCommands).toHaveLength(2);
    expect(pluginCommands.map((c) => c.name)).toContain("superpowers:run");
    expect(pluginCommands.map((c) => c.name)).toContain("superpowers:my-skill");
  });

  it("deduplicates plugin commands over skills (commands/ wins)", async () => {
    // Plugin commands dir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "overlap.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    // Plugin skills dir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "overlap", isFile: () => false, isDirectory: () => true },
    ] as any);
    // Inside the skill dir
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "SKILL.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("# content");
    vi.mocked(fs.stat).mockResolvedValue({ size: 10 } as any);

    const plugins = [
      {
        name: "test-plugin",
        installed: true,
        enabled: true,
        pluginDir: "/plugin/dir",
        scope: "user" as const,
        marketplace: "official",
        key: "test-plugin@official",
        sourcePath: "/mock/settings.json",
        mcpServers: [],
        version: null,
        installedAt: null,
        lastUpdated: null,
        pluginType: "skills" as const,
        description: null,
        installPath: null,
      },
    ];

    const result = await extractCommands([], plugins);

    // Should only have one entry for "test-plugin:overlap", not two
    const overlaps = result.commands.filter((c) => c.name === "test-plugin:overlap");
    expect(overlaps).toHaveLength(1);
  });

  it("populates content and sizeBytes", async () => {
    vi.mocked(fs.readdir).mockResolvedValueOnce([
      { name: "info.md", isFile: () => true, isDirectory: () => false },
    ] as any);
    vi.mocked(fs.readFile).mockResolvedValue("---\ndescription: Info\n---\n# Information\nBody text.");
    vi.mocked(fs.stat).mockResolvedValue({ size: 75 } as any);

    const files = [makeCommandsDir("user", "/home/user/.claude/commands")];
    const result = await extractCommands(files);

    expect(result.commands[0].content).toContain("# Information");
    expect(result.commands[0].sizeBytes).toBe(75);
  });
});
