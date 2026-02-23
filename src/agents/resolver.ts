import fs from "node:fs/promises";
import path from "node:path";
import { getGlobalClaudeDir } from "../scanner/paths.js";
import type { AgentInfo, AgentsResult } from "./types.js";

/**
 * Parse YAML frontmatter from a markdown file.
 * Extracts key-value pairs between --- delimiters.
 * Simple regex-based parser (no external YAML dependency).
 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key && value) {
      // Strip surrounding quotes if present
      frontmatter[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return frontmatter;
}

/**
 * Extract the first sentence from a description string for display.
 */
function truncateToFirstSentence(text: string): string {
  const periodIndex = text.indexOf(". ");
  if (periodIndex !== -1 && periodIndex < 200) {
    return text.slice(0, periodIndex + 1);
  }
  if (text.length > 200) {
    return text.slice(0, 200) + "\u2026";
  }
  return text;
}

/**
 * Discover all agent .md files in ~/.claude/agents/.
 *
 * Reads each markdown file, parses YAML frontmatter for metadata
 * (name, description, color, tools, model), and returns structured info.
 *
 * @returns AgentsResult with all discovered agents
 */
export async function extractAgents(): Promise<AgentsResult> {
  const globalDir = getGlobalClaudeDir();
  const agentsDir = path.join(globalDir, "agents");

  let entries: string[];
  try {
    const dirEntries = await fs.readdir(agentsDir);
    entries = dirEntries.filter((e) => e.endsWith(".md"));
  } catch {
    // Directory doesn't exist or can't be read
    return { agents: [], totalCount: 0, agentsDir };
  }

  const agentPromises = entries.map(async (fileName): Promise<AgentInfo | null> => {
    const filePath = path.join(agentsDir, fileName);
    try {
      const [content, stat] = await Promise.all([
        fs.readFile(filePath, "utf-8"),
        fs.stat(filePath),
      ]);

      const fm = parseFrontmatter(content);

      const name = fm.name || fileName.replace(/\.md$/, "");
      const description = fm.description
        ? truncateToFirstSentence(fm.description)
        : null;
      const color = fm.color || null;
      const tools = fm.tools
        ? fm.tools.split(",").map((t) => t.trim()).filter(Boolean)
        : [];
      const model = fm.model || null;

      return {
        name,
        fileName,
        path: filePath,
        description,
        color,
        tools,
        model,
        sizeBytes: stat.size,
        content,
      };
    } catch {
      return null;
    }
  });

  const results = await Promise.all(agentPromises);
  const agents = results.filter((a): a is AgentInfo => a !== null);

  // Sort alphabetically by name
  agents.sort((a, b) => a.name.localeCompare(b.name));

  return {
    agents,
    totalCount: agents.length,
    agentsDir,
  };
}
