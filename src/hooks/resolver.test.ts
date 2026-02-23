import { describe, it, expect } from "vitest";
import { extractHooks } from "./resolver.js";
import type { ConfigFile } from "../scanner/types.js";

/**
 * Helper to create a mock settings.json ConfigFile with hooks content.
 */
function makeSettingsFile(
  scope: ConfigFile["scope"],
  hooks: Record<string, unknown>,
  sourcePath?: string,
): ConfigFile {
  return {
    scope,
    type: "settings",
    expectedPath: sourcePath ?? `/mock/${scope}/settings.json`,
    description: `${scope} settings`,
    exists: true,
    readable: true,
    content: { hooks },
  };
}

describe("extractHooks", () => {
  it("returns empty events for empty files array", async () => {
    const result = await extractHooks([]);

    expect(result.events).toEqual([]);
    expect(result.configuredEvents).toEqual([]);
    expect(result.unconfiguredEvents).toEqual(result.availableEvents);
  });

  it("lists all 6 known hook events in availableEvents", async () => {
    const result = await extractHooks([]);

    expect(result.availableEvents).toContain("PreToolUse");
    expect(result.availableEvents).toContain("PostToolUse");
    expect(result.availableEvents).toContain("Notification");
    expect(result.availableEvents).toContain("Stop");
    expect(result.availableEvents).toContain("SubagentStop");
    expect(result.availableEvents).toContain("SessionStart");
    expect(result.availableEvents).toHaveLength(6);
  });

  it("extracts a simple hook with one matcher and one command", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        PreToolUse: [
          {
            hooks: [
              { type: "command", command: "echo pre-tool" },
            ],
          },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.events).toHaveLength(1);
    const event = result.events[0];
    expect(event.event).toBe("PreToolUse");
    expect(event.scope).toBe("user");
    expect(event.sourcePath).toBe("/mock/user/settings.json");
    expect(event.matchers).toHaveLength(1);
    expect(event.matchers[0].matcher).toBeUndefined();
    expect(event.matchers[0].hooks).toHaveLength(1);
    expect(event.matchers[0].hooks[0].command).toBe("echo pre-tool");
    expect(event.matchers[0].hooks[0].type).toBe("command");
  });

  it("extracts matcher pattern when specified", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("project", {
        PreToolUse: [
          {
            matcher: "Bash|Edit",
            hooks: [
              { type: "command", command: "validate-tool" },
            ],
          },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.events[0].matchers[0].matcher).toBe("Bash|Edit");
  });

  it("extracts multiple matchers for a single event", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [{ type: "command", command: "check-bash" }],
          },
          {
            matcher: "Edit|Write",
            hooks: [{ type: "command", command: "check-edit" }],
          },
          {
            hooks: [{ type: "command", command: "check-all" }],
          },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.events[0].matchers).toHaveLength(3);
    expect(result.events[0].matchers[0].matcher).toBe("Bash");
    expect(result.events[0].matchers[1].matcher).toBe("Edit|Write");
    expect(result.events[0].matchers[2].matcher).toBeUndefined();
  });

  it("extracts multiple hooks within a single matcher", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        SessionStart: [
          {
            hooks: [
              { type: "command", command: "echo hello" },
              { type: "command", command: "load-context", async: true },
            ],
          },
        ],
      }),
    ];

    const result = await extractHooks(files);

    const hooks = result.events[0].matchers[0].hooks;
    expect(hooks).toHaveLength(2);
    expect(hooks[0].command).toBe("echo hello");
    expect(hooks[0].async).toBeUndefined();
    expect(hooks[1].command).toBe("load-context");
    expect(hooks[1].async).toBe(true);
  });

  it("tracks configured and unconfigured events correctly", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        PreToolUse: [
          { hooks: [{ type: "command", command: "check" }] },
        ],
        Stop: [
          { hooks: [{ type: "command", command: "cleanup" }] },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.configuredEvents).toContain("PreToolUse");
    expect(result.configuredEvents).toContain("Stop");
    expect(result.configuredEvents).toHaveLength(2);

    expect(result.unconfiguredEvents).toContain("PostToolUse");
    expect(result.unconfiguredEvents).toContain("Notification");
    expect(result.unconfiguredEvents).toContain("SubagentStop");
    expect(result.unconfiguredEvents).toContain("SessionStart");
    expect(result.unconfiguredEvents).toHaveLength(4);
  });

  it("extracts hooks from multiple scopes independently", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        PreToolUse: [
          { hooks: [{ type: "command", command: "user-check" }] },
        ],
      }, "/home/.claude/settings.json"),
      makeSettingsFile("project", {
        PreToolUse: [
          { hooks: [{ type: "command", command: "project-check" }] },
        ],
      }, "/proj/.claude/settings.json"),
    ];

    const result = await extractHooks(files);

    // Same event from different scopes produces separate event entries
    expect(result.events).toHaveLength(2);
    const userEvent = result.events.find((e) => e.scope === "user");
    const projEvent = result.events.find((e) => e.scope === "project");
    expect(userEvent).toBeDefined();
    expect(projEvent).toBeDefined();
    expect(userEvent!.matchers[0].hooks[0].command).toBe("user-check");
    expect(projEvent!.matchers[0].hooks[0].command).toBe("project-check");
  });

  it("sorts events alphabetically by event name", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        Stop: [
          { hooks: [{ type: "command", command: "stop-hook" }] },
        ],
        Notification: [
          { hooks: [{ type: "command", command: "notify-hook" }] },
        ],
        PreToolUse: [
          { hooks: [{ type: "command", command: "pre-hook" }] },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.events[0].event).toBe("Notification");
    expect(result.events[1].event).toBe("PreToolUse");
    expect(result.events[2].event).toBe("Stop");
  });

  it("skips non-settings files", async () => {
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
      makeSettingsFile("user", {
        PreToolUse: [
          { hooks: [{ type: "command", command: "check" }] },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.events).toHaveLength(1);
  });

  it("skips files that are missing or unreadable", async () => {
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
      makeSettingsFile("project", {
        Stop: [
          { hooks: [{ type: "command", command: "cleanup" }] },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].scope).toBe("project");
  });

  it("skips settings files without hooks key", async () => {
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

    const result = await extractHooks(files);

    expect(result.events).toEqual([]);
  });

  it("skips matcher entries with no valid hooks", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              { type: "command" }, // missing command string
              null,
              "invalid",
            ],
          },
        ],
      }),
    ];

    const result = await extractHooks(files);

    // Matcher with no valid hooks still gets included (empty hooks array)
    // but the event will have a matcher with 0 hooks
    expect(result.events).toHaveLength(1);
    expect(result.events[0].matchers[0].hooks).toHaveLength(0);
  });

  it("skips non-array event config values", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        PreToolUse: "not-an-array",
        Stop: [
          { hooks: [{ type: "command", command: "cleanup" }] },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].event).toBe("Stop");
  });

  it("handles custom event names outside the known catalog", async () => {
    const files: ConfigFile[] = [
      makeSettingsFile("user", {
        CustomEvent: [
          { hooks: [{ type: "command", command: "custom-action" }] },
        ],
      }),
    ];

    const result = await extractHooks(files);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].event).toBe("CustomEvent");
    expect(result.configuredEvents).toContain("CustomEvent");
    // CustomEvent is not in unconfiguredEvents since it's not a known event
    expect(result.unconfiguredEvents).not.toContain("CustomEvent");
  });
});
