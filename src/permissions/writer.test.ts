import { describe, it, expect, vi, beforeEach } from "vitest";
import { addPermission, removePermission } from "./writer.js";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

vi.mock("node:os", () => ({
  default: {
    homedir: vi.fn(() => "/mock/home"),
  },
}));

import fs from "node:fs/promises";

beforeEach(() => {
  vi.clearAllMocks();
  (fs.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  (fs.mkdir as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
});

describe("addPermission", () => {
  it("throws on empty tool name", async () => {
    await expect(addPermission("", "allow")).rejects.toThrow(
      "Tool name is required",
    );
  });

  it("throws on whitespace-only tool name", async () => {
    await expect(addPermission("   ", "allow")).rejects.toThrow(
      "Tool name is required",
    );
  });

  it("throws on invalid rule", async () => {
    await expect(
      addPermission("Bash", "invalid" as "allow"),
    ).rejects.toThrow('Rule must be "allow", "deny", or "ask"');
  });

  it("adds tool without pattern to empty file", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    const result = await addPermission("Bash", "allow");

    expect(result).toEqual({ added: "Bash" });
    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.permissions.allow).toContain("Bash");
  });

  it("adds tool with pattern", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    const result = await addPermission("Bash", "allow", "ls *");

    expect(result).toEqual({ added: "Bash(ls *)" });
    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.permissions.allow).toContain("Bash(ls *)");
  });

  it("trims tool and pattern", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    const result = await addPermission("  Bash  ", "allow", "  ls *  ");

    expect(result).toEqual({ added: "Bash(ls *)" });
  });

  it("appends to existing rule array", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{\n  "permissions": {\n    "allow": ["Read"]\n  }\n}',
    );

    const result = await addPermission("Bash", "allow");

    expect(result).toEqual({ added: "Bash" });
    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.permissions.allow).toContain("Read");
    expect(parsed.permissions.allow).toContain("Bash");
  });

  it("creates new rule array in existing permissions", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{\n  "permissions": {\n    "allow": ["Read"]\n  }\n}',
    );

    const result = await addPermission("WebSearch", "deny");

    expect(result).toEqual({ added: "WebSearch" });
    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.permissions.allow).toContain("Read");
    expect(parsed.permissions.deny).toContain("WebSearch");
  });

  it("throws on duplicate permission", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{\n  "permissions": {\n    "allow": ["Bash"]\n  }\n}',
    );

    await expect(addPermission("Bash", "allow")).rejects.toThrow(
      "Permission already exists",
    );
  });

  it("creates directory if missing", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    await addPermission("Bash", "allow");

    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining(".claude"),
      { recursive: true },
    );
  });

  it("writes to user-scope path under homedir", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    await addPermission("Bash", "allow");

    const writePath = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(writePath).toContain("mock");
    expect(writePath).toContain(".claude");
    expect(writePath).toContain("settings.json");
  });
});

describe("removePermission", () => {
  it("refuses managed-scope paths", async () => {
    await expect(
      removePermission("/etc/.claude/settings.json", "allow", "Bash"),
    ).rejects.toThrow("Cannot modify managed-scope settings");
  });

  it("refuses ProgramData managed paths", async () => {
    await expect(
      removePermission(
        "C:\\ProgramData\\.claude\\settings.json",
        "allow",
        "Bash",
      ),
    ).rejects.toThrow("Cannot modify managed-scope settings");
  });

  it("throws when file has no permissions block", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue("{}");

    await expect(
      removePermission("/user/.claude/settings.json", "allow", "Bash"),
    ).rejects.toThrow("No permissions block found");
  });

  it("throws when rule array does not exist", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{ "permissions": { "deny": ["WebSearch"] } }',
    );

    await expect(
      removePermission("/user/.claude/settings.json", "allow", "Bash"),
    ).rejects.toThrow("No permissions.allow array found");
  });

  it("throws when entry not found in array", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{ "permissions": { "allow": ["Read"] } }',
    );

    await expect(
      removePermission("/user/.claude/settings.json", "allow", "Bash"),
    ).rejects.toThrow('Permission entry not found: "Bash"');
  });

  it("removes entry from array", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{\n  "permissions": {\n    "allow": ["Read", "Bash"]\n  }\n}',
    );

    const result = await removePermission(
      "/user/.claude/settings.json",
      "allow",
      "Bash",
    );

    expect(result).toEqual({ success: true, removed: "Bash" });
    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(written).toContain('"Read"');
    expect(written).not.toContain('"Bash"');
    expect(written).toContain('"allow"');
  });

  it("removes rule array and permissions object when last entry removed", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{\n  "permissions": {\n    "allow": ["Bash"]\n  }\n}',
    );

    const result = await removePermission(
      "/user/.claude/settings.json",
      "allow",
      "Bash",
    );

    expect(result).toEqual({ success: true, removed: "Bash" });
    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.permissions).toBeUndefined();
  });
});
