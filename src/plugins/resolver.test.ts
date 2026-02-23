import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPluginNameFromPath } from "./resolver.js";

// Mock dependencies for functions that do I/O
vi.mock("node:fs/promises", () => ({
  default: {
    stat: vi.fn(),
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

vi.mock("../scanner/parser.js", () => ({
  parseJsonc: vi.fn(),
}));

vi.mock("../scanner/paths.js", () => ({
  getGlobalClaudeDir: vi.fn(() => "/home/user/.claude"),
}));

import fs from "node:fs/promises";
import { parseJsonc } from "../scanner/parser.js";
import { readInstalledPluginsRegistry, extractPlugins } from "./resolver.js";
import type { ConfigFile } from "../scanner/types.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getPluginNameFromPath", () => {
  it("matches external_plugins/{name}/ path", () => {
    const result = getPluginNameFromPath(
      "/home/user/.claude/plugins/marketplaces/official/external_plugins/context7/agents/agent.md"
    );
    expect(result).toBe("context7");
  });

  it("matches plugins/{name}/ path", () => {
    const result = getPluginNameFromPath(
      "/home/user/.claude/plugins/marketplaces/official/plugins/frontend-design/.mcp.json"
    );
    expect(result).toBe("frontend-design");
  });

  it("matches cache/{marketplace}/{name}/{version}/ path", () => {
    const result = getPluginNameFromPath(
      "/home/user/.claude/plugins/cache/official/my-plugin/1.0.0/index.js"
    );
    expect(result).toBe("my-plugin");
  });

  it("returns null for non-matching paths", () => {
    expect(getPluginNameFromPath("/home/user/.claude/settings.json")).toBeNull();
  });

  it("normalizes Windows backslashes", () => {
    const result = getPluginNameFromPath(
      "C:\\Users\\user\\.claude\\plugins\\marketplaces\\official\\external_plugins\\my-plugin\\agent.md"
    );
    expect(result).toBe("my-plugin");
  });

  it("matches deeply nested paths within plugin directories", () => {
    const result = getPluginNameFromPath(
      "/home/user/.claude/plugins/marketplaces/community/plugins/deep-plugin/sub/dir/file.ts"
    );
    expect(result).toBe("deep-plugin");
  });
});

describe("readInstalledPluginsRegistry", () => {
  it("returns valid v2 registry", async () => {
    const registry = {
      version: 2,
      plugins: {
        "my-plugin@official": [
          { scope: "user", installPath: "/path", version: "1.0.0", installedAt: "2024-01-01", lastUpdated: "2024-01-01" },
        ],
      },
    };
    vi.mocked(parseJsonc).mockResolvedValue({ data: registry, errors: [] });

    const result = await readInstalledPluginsRegistry("/home/user/.claude");

    expect(result).not.toBeNull();
    expect(result!.version).toBe(2);
    expect(result!.plugins["my-plugin@official"]).toHaveLength(1);
  });

  it("returns null when version is not 2", async () => {
    vi.mocked(parseJsonc).mockResolvedValue({ data: { version: 1, plugins: {} }, errors: [] });

    const result = await readInstalledPluginsRegistry("/home/user/.claude");

    expect(result).toBeNull();
  });

  it("returns null when file cannot be read", async () => {
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));

    const result = await readInstalledPluginsRegistry("/home/user/.claude");

    expect(result).toBeNull();
  });

  it("returns null when plugins key is missing", async () => {
    vi.mocked(parseJsonc).mockResolvedValue({ data: { version: 2 }, errors: [] });

    const result = await readInstalledPluginsRegistry("/home/user/.claude");

    expect(result).toBeNull();
  });
});

describe("extractPlugins", () => {
  function makeSettingsFile(
    scope: ConfigFile["scope"],
    enabledPlugins: Record<string, boolean>,
  ): ConfigFile {
    return {
      scope,
      type: "settings",
      expectedPath: `/mock/${scope}/settings.json`,
      description: `${scope} settings`,
      exists: true,
      readable: true,
      content: { enabledPlugins },
    };
  }

  it("returns empty result for no settings files", async () => {
    const result = await extractPlugins([]);

    expect(result.plugins).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.enabledCount).toBe(0);
    expect(result.installedCount).toBe(0);
  });

  it("discovers a single enabled plugin", async () => {
    // Mock registry: no registry
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));
    // Mock dirExists checks — external_plugins dir exists
    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      const pathStr = String(p).replace(/\\/g, "/");
      if (pathStr.includes("external_plugins/my-plugin")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });
    // Mock fileExists and determinePluginType
    vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT")); // no .mcp.json

    const files = [makeSettingsFile("user", { "my-plugin@official": true })];
    const result = await extractPlugins(files);

    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0].name).toBe("my-plugin");
    expect(result.plugins[0].marketplace).toBe("official");
    expect(result.plugins[0].enabled).toBe(true);
    expect(result.plugins[0].installed).toBe(true);
    expect(result.totalCount).toBe(1);
    expect(result.enabledCount).toBe(1);
    expect(result.installedCount).toBe(1);
  });

  it("includes disabled plugin with enabled=false", async () => {
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));
    vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

    const files = [makeSettingsFile("user", { "disabled-plugin@official": false })];
    const result = await extractPlugins(files);

    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0].enabled).toBe(false);
    expect(result.plugins[0].installed).toBe(false);
    expect(result.enabledCount).toBe(0);
  });

  it("attaches registry metadata (version, installedAt)", async () => {
    const registry = {
      version: 2,
      plugins: {
        "my-plugin@official": [
          {
            scope: "user",
            installPath: "/installed/path",
            version: "2.3.1",
            installedAt: "2024-06-01T00:00:00Z",
            lastUpdated: "2024-07-01T00:00:00Z",
          },
        ],
      },
    };
    vi.mocked(parseJsonc).mockResolvedValue({ data: registry, errors: [] });
    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      const pathStr = String(p);
      if (pathStr === "/installed/path") {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });
    vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

    const files = [makeSettingsFile("user", { "my-plugin@official": true })];
    const result = await extractPlugins(files);

    expect(result.plugins[0].version).toBe("2.3.1");
    expect(result.plugins[0].installedAt).toBe("2024-06-01T00:00:00Z");
    expect(result.plugins[0].installPath).toBe("/installed/path");
  });

  it("deduplicates plugins across multiple settings files", async () => {
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));
    vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

    const files = [
      makeSettingsFile("user", { "my-plugin@official": true }),
      makeSettingsFile("project", { "my-plugin@official": false }),
    ];
    const result = await extractPlugins(files);

    // First scope wins — only one entry
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0].enabled).toBe(true);
  });

  it("sorts enabled plugins before disabled, then alphabetically", async () => {
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));
    vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

    const files = [
      makeSettingsFile("user", {
        "z-plugin@official": false,
        "a-plugin@official": true,
        "m-plugin@official": false,
      }),
    ];
    const result = await extractPlugins(files);

    expect(result.plugins.map((p) => p.name)).toEqual([
      "a-plugin",
      "m-plugin",
      "z-plugin",
    ]);
  });

  it("marks plugin as not installed when dir does not exist", async () => {
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));
    vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

    const files = [makeSettingsFile("user", { "missing@official": true })];
    const result = await extractPlugins(files);

    expect(result.plugins[0].installed).toBe(false);
    expect(result.installedCount).toBe(0);
  });

  it("reports correct counts", async () => {
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));
    vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));

    const files = [
      makeSettingsFile("user", {
        "enabled1@official": true,
        "enabled2@official": true,
        "disabled1@official": false,
      }),
    ];
    const result = await extractPlugins(files);

    expect(result.totalCount).toBe(3);
    expect(result.enabledCount).toBe(2);
    expect(result.installedCount).toBe(0);
  });
});
