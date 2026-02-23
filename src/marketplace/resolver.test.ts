import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEnabledPluginKeys } from "./resolver.js";
import type { ConfigFile } from "../scanner/types.js";

// Mock dependencies for extractMarketplaces
vi.mock("node:fs/promises", () => ({
  default: {
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

vi.mock("../scanner/parser.js", () => ({
  parseJsonc: vi.fn(),
}));

vi.mock("../scanner/paths.js", () => ({
  getGlobalClaudeDir: vi.fn(() => "/home/user/.claude"),
}));

vi.mock("../plugins/resolver.js", () => ({
  readInstalledPluginsRegistry: vi.fn(),
}));

import fs from "node:fs/promises";
import { parseJsonc } from "../scanner/parser.js";
import { readInstalledPluginsRegistry } from "../plugins/resolver.js";
import { extractMarketplaces } from "./resolver.js";

beforeEach(() => {
  vi.resetAllMocks();
});

/**
 * Helper to create settings ConfigFile with enabledPlugins.
 */
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

describe("getEnabledPluginKeys", () => {
  it("returns empty set for no settings files", () => {
    expect(getEnabledPluginKeys([])).toEqual(new Set());
  });

  it("extracts enabled plugin keys from a single file", () => {
    const files = [makeSettingsFile("user", { "a@official": true, "b@official": true })];
    const result = getEnabledPluginKeys(files);
    expect(result).toEqual(new Set(["a@official", "b@official"]));
  });

  it("merges enabled keys from multiple files", () => {
    const files = [
      makeSettingsFile("user", { "a@official": true }),
      makeSettingsFile("project", { "b@official": true }),
    ];
    const result = getEnabledPluginKeys(files);
    expect(result).toEqual(new Set(["a@official", "b@official"]));
  });

  it("excludes keys with false values", () => {
    const files = [
      makeSettingsFile("user", { "enabled@official": true, "disabled@official": false }),
    ];
    const result = getEnabledPluginKeys(files);
    expect(result).toEqual(new Set(["enabled@official"]));
    expect(result.has("disabled@official")).toBe(false);
  });

  it("skips non-settings files", () => {
    const files: ConfigFile[] = [
      {
        scope: "user",
        type: "mcp",
        expectedPath: "/mock/.mcp.json",
        description: "MCP config",
        exists: true,
        readable: true,
        content: { enabledPlugins: { "a@official": true } },
      },
    ];
    expect(getEnabledPluginKeys(files)).toEqual(new Set());
  });

  it("handles settings file with missing enabledPlugins key", () => {
    const files: ConfigFile[] = [
      {
        scope: "user",
        type: "settings",
        expectedPath: "/mock/settings.json",
        description: "Settings",
        exists: true,
        readable: true,
        content: { theme: "dark" },
      },
    ];
    expect(getEnabledPluginKeys(files)).toEqual(new Set());
  });
});

describe("extractMarketplaces", () => {
  /**
   * Set up mocks for a known_marketplaces.json with given marketplace entries.
   * Also sets up default empty blocklist/install-counts/registry.
   */
  function setupMarketplaceMocks(
    marketplaces: Record<string, { source: string; repo: string; installLocation: string; lastUpdated: string }>,
    opts?: {
      registry?: any;
      blocklist?: any[];
      installCounts?: Record<string, number>;
    },
  ) {
    vi.mocked(readInstalledPluginsRegistry).mockResolvedValue(opts?.registry ?? null);

    vi.mocked(parseJsonc).mockImplementation(async (filePath: string) => {
      if (filePath.includes("known_marketplaces.json")) {
        return { data: marketplaces, raw: "" };
      }
      if (filePath.includes("install-counts-cache.json")) {
        return { data: opts?.installCounts ?? {}, raw: "" };
      }
      if (filePath.includes("blocklist.json")) {
        return { data: opts?.blocklist ?? [], raw: "" };
      }
      if (filePath.includes("plugin.json")) {
        return { data: { description: "A test plugin" }, raw: "" };
      }
      throw new Error("ENOENT");
    });
  }

  it("returns empty result when no known_marketplaces exists", async () => {
    vi.mocked(readInstalledPluginsRegistry).mockResolvedValue(null);
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));

    const result = await extractMarketplaces([]);

    expect(result.marketplaces).toEqual([]);
    expect(result.totalPlugins).toBe(0);
    expect(result.blockedPlugins).toEqual([]);
  });

  it("discovers a single marketplace with plugins", async () => {
    setupMarketplaceMocks({
      "official": {
        source: "github",
        repo: "claude-plugins/official",
        installLocation: "/home/user/.claude/plugins/marketplaces/official",
        lastUpdated: "2024-01-01T00:00:00Z",
      },
    });

    // Mock dirExists: plugins/ exists, external_plugins/ does not
    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      const pathStr = String(p).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });

    // Mock listSubdirs for the plugins directory
    vi.mocked(fs.readdir).mockImplementation(async (dirPath: any) => {
      const pathStr = String(dirPath).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return [
          { name: "my-plugin", isDirectory: () => true },
        ] as any;
      }
      return [];
    });

    const result = await extractMarketplaces([]);

    expect(result.marketplaces).toHaveLength(1);
    expect(result.marketplaces[0].id).toBe("official");
    expect(result.marketplaces[0].pluginCount).toBe(1);
    expect(result.marketplaces[0].plugins[0].name).toBe("my-plugin");
    expect(result.totalPlugins).toBe(1);
  });

  it("cross-references enabled/installed/blocked status", async () => {
    setupMarketplaceMocks(
      {
        "official": {
          source: "github",
          repo: "repo",
          installLocation: "/path",
          lastUpdated: "2024-01-01",
        },
      },
      {
        registry: {
          version: 2,
          plugins: { "my-plugin@official": [{ scope: "user" }] },
        },
        blocklist: [{ plugin: "blocked-plugin", reason: "malicious" }],
      },
    );

    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      const pathStr = String(p).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: any) => {
      const pathStr = String(dirPath).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return [
          { name: "my-plugin", isDirectory: () => true },
          { name: "blocked-plugin", isDirectory: () => true },
        ] as any;
      }
      return [];
    });

    const files = [makeSettingsFile("user", { "my-plugin@official": true })];
    const result = await extractMarketplaces(files);

    const myPlugin = result.marketplaces[0].plugins.find((p) => p.name === "my-plugin");
    expect(myPlugin!.enabled).toBe(true);
    expect(myPlugin!.installed).toBe(true);

    const blockedPlugin = result.marketplaces[0].plugins.find((p) => p.name === "blocked-plugin");
    expect(blockedPlugin!.blocked).toBe(true);
    expect(blockedPlugin!.enabled).toBe(false);
  });

  it("sorts plugins: enabled > installed > alphabetical", async () => {
    setupMarketplaceMocks(
      {
        "official": {
          source: "github",
          repo: "repo",
          installLocation: "/path",
          lastUpdated: "2024-01-01",
        },
      },
      {
        registry: {
          version: 2,
          plugins: { "installed-only@official": [{ scope: "user" }] },
        },
      },
    );

    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      const pathStr = String(p).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: any) => {
      const pathStr = String(dirPath).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return [
          { name: "z-plugin", isDirectory: () => true },
          { name: "installed-only", isDirectory: () => true },
          { name: "enabled-plugin", isDirectory: () => true },
        ] as any;
      }
      return [];
    });

    const files = [makeSettingsFile("user", { "enabled-plugin@official": true })];
    const result = await extractMarketplaces(files);

    const names = result.marketplaces[0].plugins.map((p) => p.name);
    expect(names[0]).toBe("enabled-plugin");
    expect(names[1]).toBe("installed-only");
  });

  it("reads plugin description from manifest", async () => {
    setupMarketplaceMocks({
      "official": {
        source: "github",
        repo: "repo",
        installLocation: "/path",
        lastUpdated: "2024-01-01",
      },
    });

    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      const pathStr = String(p).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: any) => {
      const pathStr = String(dirPath).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return [{ name: "test-plugin", isDirectory: () => true }] as any;
      }
      return [];
    });

    const result = await extractMarketplaces([]);

    expect(result.marketplaces[0].plugins[0].description).toBe("A test plugin");
  });

  it("applies install counts from cache", async () => {
    setupMarketplaceMocks(
      {
        "official": {
          source: "github",
          repo: "repo",
          installLocation: "/path",
          lastUpdated: "2024-01-01",
        },
      },
      { installCounts: { "my-plugin@official": 42 } },
    );

    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      const pathStr = String(p).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: any) => {
      const pathStr = String(dirPath).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return [{ name: "my-plugin", isDirectory: () => true }] as any;
      }
      return [];
    });

    const result = await extractMarketplaces([]);

    expect(result.marketplaces[0].plugins[0].installCount).toBe(42);
  });

  it("sums totalPlugins across marketplaces", async () => {
    setupMarketplaceMocks({
      "official": {
        source: "github",
        repo: "repo1",
        installLocation: "/path1",
        lastUpdated: "2024-01-01",
      },
      "community": {
        source: "github",
        repo: "repo2",
        installLocation: "/path2",
        lastUpdated: "2024-01-01",
      },
    });

    vi.mocked(fs.stat).mockImplementation(async (p: any) => {
      const pathStr = String(p).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return { isDirectory: () => true } as any;
      }
      throw new Error("ENOENT");
    });

    vi.mocked(fs.readdir).mockImplementation(async (dirPath: any) => {
      const pathStr = String(dirPath).replace(/\\/g, "/");
      if (pathStr.endsWith("/plugins")) {
        return [
          { name: "plugin-a", isDirectory: () => true },
          { name: "plugin-b", isDirectory: () => true },
        ] as any;
      }
      return [];
    });

    const result = await extractMarketplaces([]);

    expect(result.totalPlugins).toBe(4); // 2 per marketplace
  });

  it("returns blocked plugins list", async () => {
    setupMarketplaceMocks(
      {
        "official": {
          source: "github",
          repo: "repo",
          installLocation: "/path",
          lastUpdated: "2024-01-01",
        },
      },
      {
        blocklist: [
          { plugin: "evil-plugin", reason: "security risk" },
          { plugin: "spam-plugin", reason: "spam" },
        ],
      },
    );

    vi.mocked(fs.stat).mockRejectedValue(new Error("ENOENT"));
    vi.mocked(fs.readdir).mockResolvedValue([] as any);

    const result = await extractMarketplaces([]);

    expect(result.blockedPlugins).toHaveLength(2);
    expect(result.blockedPlugins[0].plugin).toBe("evil-plugin");
    expect(result.blockedPlugins[0].reason).toBe("security risk");
  });
});
