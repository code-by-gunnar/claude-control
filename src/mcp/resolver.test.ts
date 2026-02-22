import { describe, it, expect } from "vitest";
import { extractMcpServers } from "./resolver.js";
import type { ConfigFile } from "../scanner/types.js";

/**
 * Helper to create a mock .mcp.json ConfigFile with direct server entries.
 */
function makeMcpFile(
  scope: ConfigFile["scope"],
  content: Record<string, unknown>,
  sourcePath?: string,
): ConfigFile {
  return {
    scope,
    type: "mcp",
    expectedPath: sourcePath ?? `/mock/${scope}/.mcp.json`,
    description: `${scope} MCP config`,
    exists: true,
    readable: true,
    content,
  };
}

/**
 * Helper to create a mock settings.json ConfigFile with mcpServers key.
 */
function makeSettingsFile(
  scope: ConfigFile["scope"],
  mcpServers: Record<string, unknown>,
  sourcePath?: string,
): ConfigFile {
  return {
    scope,
    type: "settings",
    expectedPath: sourcePath ?? `/mock/${scope}/settings.json`,
    description: `${scope} settings`,
    exists: true,
    readable: true,
    content: { mcpServers },
  };
}

describe("extractMcpServers", () => {
  it("returns empty result for empty files array", async () => {
    const result = await extractMcpServers([]);

    expect(result.servers).toEqual([]);
    expect(result.duplicates).toEqual([]);
  });

  it("extracts command-type server from .mcp.json", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          myServer: {
            command: "npx",
            args: ["-y", "my-mcp-server"],
          },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(1);
    const server = result.servers[0];
    expect(server.name).toBe("myServer");
    expect(server.type).toBe("command");
    expect(server.command).toBe("npx");
    expect(server.args).toEqual(["-y", "my-mcp-server"]);
    expect(server.scope).toBe("user");
    expect(server.sourcePath).toBe("/mock/user/.mcp.json");
  });

  it("extracts http-type server from .mcp.json", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("project", {
        mcpServers: {
          apiServer: {
            type: "http",
            url: "https://api.example.com/mcp",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer sk-secret-key",
            },
          },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(1);
    const server = result.servers[0];
    expect(server.name).toBe("apiServer");
    expect(server.type).toBe("http");
    expect(server.url).toBe("https://api.example.com/mcp");
  });

  it("masks secret header values", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          apiServer: {
            type: "http",
            url: "https://api.example.com",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer sk-secret-key",
              "X-Api-Key": "sk-abc123",
              "X-Custom": "${API_KEY}",
              "X-Safe": "safe-value",
            },
          },
        },
      }),
    ];

    const result = await extractMcpServers(files);
    const headers = result.servers[0].headers!;

    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBe("***");
    expect(headers["X-Api-Key"]).toBe("***");
    expect(headers["X-Custom"]).toBe("***");
    expect(headers["X-Safe"]).toBe("safe-value");
  });

  it("masks all environment variable values", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          myServer: {
            command: "node",
            args: ["server.js"],
            env: {
              API_KEY: "secret-key",
              DATABASE_URL: "postgres://localhost:5432/db",
            },
          },
        },
      }),
    ];

    const result = await extractMcpServers(files);
    const env = result.servers[0].env!;

    expect(env["API_KEY"]).toBe("***");
    expect(env["DATABASE_URL"]).toBe("***");
  });

  it("extracts servers from settings.json with mcpServers key", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        myServer: {
          command: "npx",
          args: ["-y", "my-server"],
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].name).toBe("myServer");
    expect(result.servers[0].type).toBe("command");
  });

  it("extracts from direct format (no mcpServers wrapper)", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("project", {
        directServer: {
          command: "python",
          args: ["-m", "mcp_server"],
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].name).toBe("directServer");
    expect(result.servers[0].command).toBe("python");
  });

  it("detects duplicate server names across files", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          shared: { command: "node", args: ["user-server.js"] },
        },
      }, "/home/.claude/.mcp.json"),
      makeMcpFile("project", {
        mcpServers: {
          shared: { command: "node", args: ["project-server.js"] },
        },
      }, "/proj/.mcp.json"),
    ];

    const result = await extractMcpServers(files);

    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].name).toBe("shared");
    expect(result.duplicates[0].locations).toHaveLength(2);
    expect(result.duplicates[0].locations[0].scope).toBe("project");
    expect(result.duplicates[0].locations[0].sourcePath).toBe("/proj/.mcp.json");
    expect(result.duplicates[0].locations[1].scope).toBe("user");
    expect(result.duplicates[0].locations[1].sourcePath).toBe("/home/.claude/.mcp.json");
  });

  it("does not flag unique server names as duplicates", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          serverA: { command: "node", args: ["a.js"] },
        },
      }),
      makeMcpFile("project", {
        mcpServers: {
          serverB: { command: "node", args: ["b.js"] },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.duplicates).toEqual([]);
    expect(result.servers).toHaveLength(2);
  });

  it("sorts servers by scope priority (project first, then user)", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          userServer: { command: "node", args: ["user.js"] },
        },
      }),
      makeMcpFile("project", {
        mcpServers: {
          projectServer: { command: "node", args: ["project.js"] },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(2);
    expect(result.servers[0].name).toBe("projectServer");
    expect(result.servers[0].scope).toBe("project");
    expect(result.servers[1].name).toBe("userServer");
    expect(result.servers[1].scope).toBe("user");
  });

  it("skips non-mcp and non-settings files", async () => {
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
      makeMcpFile("user", {
        mcpServers: {
          myServer: { command: "node", args: ["server.js"] },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].name).toBe("myServer");
  });

  it("skips files that are missing or unreadable", async () => {
    const files: ConfigFile[] = [
      {
        scope: "user",
        type: "mcp",
        expectedPath: "/home/.claude/.mcp.json",
        description: "User MCP config",
        exists: false,
        readable: false,
        content: undefined,
      },
      makeMcpFile("project", {
        mcpServers: {
          myServer: { command: "node", args: ["server.js"] },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].scope).toBe("project");
  });

  it("skips settings files without mcpServers key", async () => {
    const files: ConfigFile[] = [
      {
        scope: "user",
        type: "settings",
        expectedPath: "/mock/user/settings.json",
        description: "User settings",
        exists: true,
        readable: true,
        content: { theme: "dark", verbose: true },
      },
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toEqual([]);
  });

  it("determines server type from url field when type is not explicit", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          httpServer: {
            url: "https://api.example.com/mcp",
          },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers[0].type).toBe("http");
    expect(result.servers[0].url).toBe("https://api.example.com/mcp");
  });

  it("defaults to command type when no command or url present", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          unknownServer: { args: ["--some-flag"] },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers[0].type).toBe("command");
  });

  it("handles multiple servers from a single file", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          alpha: { command: "node", args: ["alpha.js"] },
          beta: { type: "http", url: "https://beta.example.com" },
          gamma: { command: "python", args: ["-m", "gamma"] },
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(3);
    const names = result.servers.map((s) => s.name);
    expect(names).toContain("alpha");
    expect(names).toContain("beta");
    expect(names).toContain("gamma");
  });

  it("skips non-object entries within server configs", async () => {
    const files: ConfigFile[] = [
      makeMcpFile("user", {
        mcpServers: {
          validServer: { command: "node", args: ["server.js"] },
          nullEntry: null,
          stringEntry: "invalid",
          arrayEntry: [1, 2, 3],
        },
      }),
    ];

    const result = await extractMcpServers(files);

    expect(result.servers).toHaveLength(1);
    expect(result.servers[0].name).toBe("validServer");
  });
});
