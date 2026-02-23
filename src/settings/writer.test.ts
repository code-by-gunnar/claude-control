import { describe, it, expect, vi, beforeEach } from "vitest";
import { setSetting } from "./writer.js";

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

describe("setSetting", () => {
  it("throws on empty key", async () => {
    await expect(setSetting("", true)).rejects.toThrow("Setting key is required");
  });

  it("throws on whitespace-only key", async () => {
    await expect(setSetting("   ", true)).rejects.toThrow("Setting key is required");
  });

  it("creates file when it does not exist", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    await setSetting("verbose", true);

    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining(".claude"),
      { recursive: true },
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("settings.json"),
      expect.any(String),
      "utf-8",
    );

    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(JSON.parse(written)).toEqual({ verbose: true });
  });

  it("modifies existing file content", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{\n  "existingKey": "value"\n}',
    );

    await setSetting("verbose", true);

    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    const parsed = JSON.parse(written);
    expect(parsed.existingKey).toBe("value");
    expect(parsed.verbose).toBe(true);
  });

  it("overwrites existing key value", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      '{\n  "verbose": false\n}',
    );

    await setSetting("verbose", true);

    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(JSON.parse(written)).toEqual({ verbose: true });
  });

  it("trims key before writing", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    const result = await setSetting("  verbose  ", true);

    expect(result.key).toBe("verbose");
    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(JSON.parse(written)).toEqual({ verbose: true });
  });

  it("returns key and value on success", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    const result = await setSetting("verbose", true);

    expect(result).toEqual({ key: "verbose", value: true });
  });

  it("handles non-boolean values", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    const result = await setSetting("theme", "dark");

    expect(result).toEqual({ key: "theme", value: "dark" });
    const written = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
    expect(JSON.parse(written)).toEqual({ theme: "dark" });
  });

  it("writes to user-scope path under homedir", async () => {
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("ENOENT"),
    );

    await setSetting("verbose", true);

    const writePath = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(writePath).toContain("mock");
    expect(writePath).toContain(".claude");
    expect(writePath).toContain("settings.json");
  });
});
