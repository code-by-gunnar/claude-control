import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../scanner/parser.js", () => ({
  parseJsonc: vi.fn(),
}));

vi.mock("../scanner/paths.js", () => ({
  getGlobalClaudeDir: vi.fn(() => "/home/user/.claude"),
}));

import { parseJsonc } from "../scanner/parser.js";
import { extractAccountInfo } from "./resolver.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("extractAccountInfo", () => {
  it("extracts subscriptionType and rateLimitTier from valid credentials", async () => {
    vi.mocked(parseJsonc).mockResolvedValue({
      data: {
        claudeAiOauth: {
          subscriptionType: "max",
          rateLimitTier: "default_claude_max_5x",
          accessToken: "secret-token",
        },
      },
      errors: [],
    });

    const result = await extractAccountInfo();

    expect(result.subscriptionType).toBe("max");
    expect(result.rateLimitTier).toBe("default_claude_max_5x");
  });

  it("returns nulls when claudeAiOauth key is missing", async () => {
    vi.mocked(parseJsonc).mockResolvedValue({
      data: { someOtherKey: "value" },
      errors: [],
    });

    const result = await extractAccountInfo();

    expect(result.subscriptionType).toBeNull();
    expect(result.rateLimitTier).toBeNull();
  });

  it("returns nulls when credentials file does not exist", async () => {
    vi.mocked(parseJsonc).mockRejectedValue(new Error("ENOENT"));

    const result = await extractAccountInfo();

    expect(result.subscriptionType).toBeNull();
    expect(result.rateLimitTier).toBeNull();
  });

  it("returns null subscriptionType when it is not a string", async () => {
    vi.mocked(parseJsonc).mockResolvedValue({
      data: {
        claudeAiOauth: {
          subscriptionType: 123,
          rateLimitTier: "tier",
        },
      },
      errors: [],
    });

    const result = await extractAccountInfo();

    expect(result.subscriptionType).toBeNull();
    expect(result.rateLimitTier).toBe("tier");
  });

  it("handles only subscriptionType present", async () => {
    vi.mocked(parseJsonc).mockResolvedValue({
      data: {
        claudeAiOauth: {
          subscriptionType: "pro",
        },
      },
      errors: [],
    });

    const result = await extractAccountInfo();

    expect(result.subscriptionType).toBe("pro");
    expect(result.rateLimitTier).toBeNull();
  });

  it("handles only rateLimitTier present", async () => {
    vi.mocked(parseJsonc).mockResolvedValue({
      data: {
        claudeAiOauth: {
          rateLimitTier: "default",
        },
      },
      errors: [],
    });

    const result = await extractAccountInfo();

    expect(result.subscriptionType).toBeNull();
    expect(result.rateLimitTier).toBe("default");
  });

  it("returns nulls on parse error", async () => {
    vi.mocked(parseJsonc).mockRejectedValue(new Error("Unexpected token"));

    const result = await extractAccountInfo();

    expect(result.subscriptionType).toBeNull();
    expect(result.rateLimitTier).toBeNull();
  });
});
