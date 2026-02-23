import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseFrontmatter, truncateToFirstSentence } from "./resolver.js";

// Mock dependencies for extractAgents
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
import { extractAgents } from "./resolver.js";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("parseFrontmatter", () => {
  it("returns empty object when no frontmatter present", () => {
    expect(parseFrontmatter("# Just a heading\nSome text")).toEqual({});
  });

  it("extracts basic key: value pairs", () => {
    const content = "---\nname: my-agent\ndescription: A test agent\n---\n# Body";
    const result = parseFrontmatter(content);
    expect(result.name).toBe("my-agent");
    expect(result.description).toBe("A test agent");
  });

  it("strips double-quoted values", () => {
    const content = '---\nname: "my-agent"\n---\n';
    expect(parseFrontmatter(content).name).toBe("my-agent");
  });

  it("strips single-quoted values", () => {
    const content = "---\nname: 'my-agent'\n---\n";
    expect(parseFrontmatter(content).name).toBe("my-agent");
  });

  it("parses multiple keys", () => {
    const content = "---\nname: agent\ncolor: blue\nmodel: opus\n---\n";
    const result = parseFrontmatter(content);
    expect(Object.keys(result)).toHaveLength(3);
    expect(result.name).toBe("agent");
    expect(result.color).toBe("blue");
    expect(result.model).toBe("opus");
  });

  it("handles CRLF line endings", () => {
    const content = "---\r\nname: agent\r\ncolor: red\r\n---\r\n# Body";
    const result = parseFrontmatter(content);
    expect(result.name).toBe("agent");
    expect(result.color).toBe("red");
  });

  it("skips entries with empty value after colon", () => {
    const content = "---\nname: agent\nempty:\n---\n";
    const result = parseFrontmatter(content);
    expect(result.name).toBe("agent");
    expect(result).not.toHaveProperty("empty");
  });

  it("skips lines without a colon", () => {
    const content = "---\nname: agent\nno-colon-here\n---\n";
    const result = parseFrontmatter(content);
    expect(result.name).toBe("agent");
    expect(Object.keys(result)).toHaveLength(1);
  });
});

describe("truncateToFirstSentence", () => {
  it("returns short text as-is", () => {
    expect(truncateToFirstSentence("Short text.")).toBe("Short text.");
  });

  it("extracts the first sentence at period-space boundary", () => {
    const text = "First sentence. Second sentence continues here.";
    expect(truncateToFirstSentence(text)).toBe("First sentence.");
  });

  it("truncates text over 200 chars with no period to 200 + ellipsis", () => {
    const text = "a".repeat(250);
    const result = truncateToFirstSentence(text);
    expect(result).toBe("a".repeat(200) + "\u2026");
  });

  it("truncates when first period is beyond 200 chars", () => {
    const text = "a".repeat(210) + ". rest";
    const result = truncateToFirstSentence(text);
    expect(result).toBe("a".repeat(200) + "\u2026");
  });

  it("extracts sentence when period is under 200 chars", () => {
    const text = "a".repeat(50) + ". " + "b".repeat(200);
    const result = truncateToFirstSentence(text);
    expect(result).toBe("a".repeat(50) + ".");
  });
});

describe("extractAgents", () => {
  it("returns empty result when agents directory does not exist", async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error("ENOENT"));

    const result = await extractAgents();

    expect(result.agents).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it("parses a single .md agent file correctly", async () => {
    const mdContent = "---\nname: reviewer\ndescription: Reviews code\ncolor: blue\ntools: Read,Grep,Glob\nmodel: opus\n---\n# Reviewer agent";

    vi.mocked(fs.readdir).mockResolvedValue(["reviewer.md"] as any);
    vi.mocked(fs.readFile).mockResolvedValue(mdContent);
    vi.mocked(fs.stat).mockResolvedValue({ size: 120 } as any);

    const result = await extractAgents();

    expect(result.agents).toHaveLength(1);
    expect(result.totalCount).toBe(1);
    const agent = result.agents[0];
    expect(agent.name).toBe("reviewer");
    expect(agent.description).toBe("Reviews code");
    expect(agent.color).toBe("blue");
    expect(agent.tools).toEqual(["Read", "Grep", "Glob"]);
    expect(agent.model).toBe("opus");
    expect(agent.sizeBytes).toBe(120);
    expect(agent.fileName).toBe("reviewer.md");
    expect(agent.content).toBe(mdContent);
  });

  it("sorts multiple agents alphabetically by name", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["zeta.md", "alpha.md"] as any);
    vi.mocked(fs.readFile).mockResolvedValue("---\n---\n");
    vi.mocked(fs.stat).mockResolvedValue({ size: 10 } as any);

    const result = await extractAgents();

    expect(result.agents[0].name).toBe("alpha");
    expect(result.agents[1].name).toBe("zeta");
  });

  it("splits tools from comma-separated string", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["agent.md"] as any);
    vi.mocked(fs.readFile).mockResolvedValue("---\ntools: Read, Write, Bash\n---\n");
    vi.mocked(fs.stat).mockResolvedValue({ size: 10 } as any);

    const result = await extractAgents();

    expect(result.agents[0].tools).toEqual(["Read", "Write", "Bash"]);
  });

  it("uses filename as name when no frontmatter name", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["my-agent.md"] as any);
    vi.mocked(fs.readFile).mockResolvedValue("# No frontmatter\nJust content");
    vi.mocked(fs.stat).mockResolvedValue({ size: 30 } as any);

    const result = await extractAgents();

    expect(result.agents[0].name).toBe("my-agent");
    expect(result.agents[0].description).toBeNull();
    expect(result.agents[0].tools).toEqual([]);
  });

  it("skips unreadable files gracefully", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["good.md", "bad.md"] as any);
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce("---\nname: good\n---\n")
      .mockRejectedValueOnce(new Error("EACCES"));
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({ size: 20 } as any)
      .mockRejectedValueOnce(new Error("EACCES"));

    const result = await extractAgents();

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe("good");
  });

  it("ignores non-.md files in agents directory", async () => {
    vi.mocked(fs.readdir).mockResolvedValue(["agent.md", "readme.txt", "config.json"] as any);
    vi.mocked(fs.readFile).mockResolvedValue("---\nname: agent\n---\n");
    vi.mocked(fs.stat).mockResolvedValue({ size: 10 } as any);

    const result = await extractAgents();

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe("agent");
  });
});
