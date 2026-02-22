import { describe, it, expect } from "vitest";
import { resolveSettings } from "./resolver.js";
import type { ScopedSettings } from "./types.js";

describe("resolveSettings", () => {
  // Test 1: Single scope, single key -> effective value from that scope
  it("resolves a single scope with a single key", () => {
    const scoped: ScopedSettings[] = [
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        settings: { theme: "dark" },
      },
    ];

    const result = resolveSettings(scoped);

    expect(result.settings).toHaveLength(1);
    expect(result.settings[0].key).toBe("theme");
    expect(result.settings[0].effectiveValue).toBe("dark");
    expect(result.settings[0].effectiveScope).toBe("user");
    expect(result.settings[0].effectiveSourcePath).toBe(
      "/home/user/.claude/settings.json",
    );
    expect(result.settings[0].overrides).toEqual([
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        value: "dark",
      },
    ]);
  });

  // Test 2: Two scopes, no key overlap -> both keys in result
  it("merges two scopes with no overlapping keys", () => {
    const scoped: ScopedSettings[] = [
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        settings: { theme: "dark" },
      },
      {
        scope: "project",
        path: "/project/.claude/settings.json",
        settings: { linter: "eslint" },
      },
    ];

    const result = resolveSettings(scoped);

    expect(result.settings).toHaveLength(2);

    // Results sorted alphabetically by key
    const linter = result.settings.find((s) => s.key === "linter");
    const theme = result.settings.find((s) => s.key === "theme");

    expect(linter).toBeDefined();
    expect(linter!.effectiveValue).toBe("eslint");
    expect(linter!.effectiveScope).toBe("project");

    expect(theme).toBeDefined();
    expect(theme!.effectiveValue).toBe("dark");
    expect(theme!.effectiveScope).toBe("user");
  });

  // Test 3: Two scopes, same key -> higher priority scope wins
  it("resolves conflicting keys with higher priority scope winning", () => {
    const scoped: ScopedSettings[] = [
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        settings: { theme: "dark" },
      },
      {
        scope: "project",
        path: "/project/.claude/settings.json",
        settings: { theme: "light" },
      },
    ];

    const result = resolveSettings(scoped);

    expect(result.settings).toHaveLength(1);
    expect(result.settings[0].key).toBe("theme");
    expect(result.settings[0].effectiveValue).toBe("light");
    expect(result.settings[0].effectiveScope).toBe("project");
    expect(result.settings[0].effectiveSourcePath).toBe(
      "/project/.claude/settings.json",
    );

    // Overrides sorted by priority (highest first)
    expect(result.settings[0].overrides).toEqual([
      {
        scope: "project",
        path: "/project/.claude/settings.json",
        value: "light",
      },
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        value: "dark",
      },
    ]);
  });

  // Test 4: All four scopes, same key -> local wins, all four in overrides
  it("resolves all four scopes with local taking priority", () => {
    const scoped: ScopedSettings[] = [
      {
        scope: "managed",
        path: "/etc/claude/settings.json",
        settings: { theme: "corporate" },
      },
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        settings: { theme: "dark" },
      },
      {
        scope: "project",
        path: "/project/.claude/settings.json",
        settings: { theme: "light" },
      },
      {
        scope: "local",
        path: "/project/.claude/settings.local.json",
        settings: { theme: "solarized" },
      },
    ];

    const result = resolveSettings(scoped);

    expect(result.settings).toHaveLength(1);
    expect(result.settings[0].key).toBe("theme");
    expect(result.settings[0].effectiveValue).toBe("solarized");
    expect(result.settings[0].effectiveScope).toBe("local");
    expect(result.settings[0].effectiveSourcePath).toBe(
      "/project/.claude/settings.local.json",
    );

    // All four scopes in overrides, sorted by priority (highest first)
    expect(result.settings[0].overrides).toHaveLength(4);
    expect(result.settings[0].overrides[0].scope).toBe("local");
    expect(result.settings[0].overrides[1].scope).toBe("project");
    expect(result.settings[0].overrides[2].scope).toBe("user");
    expect(result.settings[0].overrides[3].scope).toBe("managed");
  });

  // Test 5: Mixed - some keys shared, some unique -> correct merge
  it("correctly merges mixed shared and unique keys", () => {
    const scoped: ScopedSettings[] = [
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        settings: { theme: "dark", editor: "vim" },
      },
      {
        scope: "project",
        path: "/project/.claude/settings.json",
        settings: { theme: "light", linter: "eslint" },
      },
    ];

    const result = resolveSettings(scoped);

    expect(result.settings).toHaveLength(3);

    // Sorted alphabetically: editor, linter, theme
    expect(result.settings[0].key).toBe("editor");
    expect(result.settings[0].effectiveValue).toBe("vim");
    expect(result.settings[0].effectiveScope).toBe("user");
    expect(result.settings[0].overrides).toHaveLength(1);

    expect(result.settings[1].key).toBe("linter");
    expect(result.settings[1].effectiveValue).toBe("eslint");
    expect(result.settings[1].effectiveScope).toBe("project");
    expect(result.settings[1].overrides).toHaveLength(1);

    expect(result.settings[2].key).toBe("theme");
    expect(result.settings[2].effectiveValue).toBe("light");
    expect(result.settings[2].effectiveScope).toBe("project");
    expect(result.settings[2].overrides).toHaveLength(2);
  });

  // Test 6: Empty scoped array -> empty result
  it("returns empty result for empty scoped array", () => {
    const result = resolveSettings([]);

    expect(result.settings).toEqual([]);
  });

  // Test 7: Scope with empty settings object -> no keys contributed
  it("handles scope with empty settings object", () => {
    const scoped: ScopedSettings[] = [
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        settings: {},
      },
      {
        scope: "project",
        path: "/project/.claude/settings.json",
        settings: { linter: "eslint" },
      },
    ];

    const result = resolveSettings(scoped);

    expect(result.settings).toHaveLength(1);
    expect(result.settings[0].key).toBe("linter");
    expect(result.settings[0].effectiveValue).toBe("eslint");
  });

  // Test 8: Nested object value -> treated as opaque value (not deep merged)
  it("treats nested objects as opaque values without deep merging", () => {
    const scoped: ScopedSettings[] = [
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        settings: {
          permissions: { allow: ["read"], deny: ["write"] },
        },
      },
      {
        scope: "project",
        path: "/project/.claude/settings.json",
        settings: {
          permissions: { allow: ["read", "write"] },
        },
      },
    ];

    const result = resolveSettings(scoped);

    expect(result.settings).toHaveLength(1);
    expect(result.settings[0].key).toBe("permissions");
    // Project scope wins entirely - no deep merge
    expect(result.settings[0].effectiveValue).toEqual({
      allow: ["read", "write"],
    });
    expect(result.settings[0].effectiveScope).toBe("project");
  });

  // Test 9: Settings sorted alphabetically by key
  it("sorts results alphabetically by key", () => {
    const scoped: ScopedSettings[] = [
      {
        scope: "user",
        path: "/home/user/.claude/settings.json",
        settings: {
          zebra: true,
          apple: false,
          mango: 42,
        },
      },
    ];

    const result = resolveSettings(scoped);

    expect(result.settings).toHaveLength(3);
    expect(result.settings[0].key).toBe("apple");
    expect(result.settings[1].key).toBe("mango");
    expect(result.settings[2].key).toBe("zebra");
  });
});
