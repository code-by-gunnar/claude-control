import fs from "node:fs/promises";
import nodePath from "node:path";
import type { ConfigFile } from "../scanner/types.js";
import type {
  CommandEntry,
  CommandsResult,
  HookEntry,
  HookEvent,
  HookMatcher,
  HookScript,
  HooksResult,
} from "./types.js";
import type { PluginInfo } from "../plugins/types.js";
import { getGlobalClaudeDir } from "../scanner/paths.js";

/**
 * All known Claude Code hook event names.
 *
 * These are the events that Claude Code fires during operation.
 * Users can configure hooks for any of these events in settings.json.
 */
const KNOWN_HOOK_EVENTS: string[] = [
  "PreToolUse",
  "PostToolUse",
  "Notification",
  "Stop",
  "SubagentStop",
  "SessionStart",
];

/**
 * Scope priority for sorting: project first (highest priority), then user, managed last.
 * Lower index = higher priority.
 */
const SCOPE_PRIORITY: Record<string, number> = {
  project: 0,
  local: 1,
  user: 2,
  managed: 3,
};

/**
 * Extract all configured hooks from scanned configuration files.
 *
 * Filters for settings files with a "hooks" key, parses each event's
 * matcher objects and hook entries, and computes configured vs unconfigured
 * event status against the known event catalog.
 *
 * @param files - All scanned configuration files from a scan() call
 * @returns HooksResult with events, available/configured/unconfigured lists
 */
export async function extractHooks(files: ConfigFile[]): Promise<HooksResult> {
  const allEvents: HookEvent[] = [];

  // Deduplicate input files by expectedPath (same fix as MCP resolver).
  // Running from ~ causes ~/.claude/settings.json to appear as both "user"
  // and "project" scope, which would double all hook entries.
  const pathBestFile = new Map<string, ConfigFile>();
  for (const file of files) {
    const existing = pathBestFile.get(file.expectedPath);
    if (!existing) {
      pathBestFile.set(file.expectedPath, file);
    } else {
      const existingPriority = SCOPE_PRIORITY[existing.scope] ?? 99;
      const filePriority = SCOPE_PRIORITY[file.scope] ?? 99;
      if (filePriority < existingPriority) {
        pathBestFile.set(file.expectedPath, file);
      }
    }
  }
  const deduplicatedFiles = Array.from(pathBestFile.values());

  // Filter for settings files that exist, are readable, and have content
  const settingsFiles = deduplicatedFiles.filter(
    (f) =>
      f.type === "settings" &&
      f.exists &&
      f.readable &&
      f.content !== undefined &&
      f.content !== null &&
      typeof f.content === "object"
  );

  for (const file of settingsFiles) {
    const content = file.content as Record<string, unknown>;

    // Check if this settings file has a "hooks" key
    if (
      !content.hooks ||
      typeof content.hooks !== "object" ||
      Array.isArray(content.hooks)
    ) {
      continue;
    }

    const hooksObj = content.hooks as Record<string, unknown>;

    // Iterate event names (keys of the hooks object)
    for (const [eventName, eventConfig] of Object.entries(hooksObj)) {
      if (!Array.isArray(eventConfig)) continue;

      const matchers: HookMatcher[] = [];

      for (const matcherRaw of eventConfig) {
        if (!matcherRaw || typeof matcherRaw !== "object" || Array.isArray(matcherRaw)) {
          continue;
        }

        const matcherObj = matcherRaw as Record<string, unknown>;
        const hooks: HookEntry[] = [];

        // Parse hooks array within this matcher
        if (Array.isArray(matcherObj.hooks)) {
          for (const hookRaw of matcherObj.hooks) {
            if (!hookRaw || typeof hookRaw !== "object" || Array.isArray(hookRaw)) {
              continue;
            }

            const hookObj = hookRaw as Record<string, unknown>;

            if (typeof hookObj.command === "string") {
              const entry: HookEntry = {
                type: "command",
                command: hookObj.command,
              };

              if (typeof hookObj.async === "boolean") {
                entry.async = hookObj.async;
              }

              hooks.push(entry);
            }
          }
        }

        const matcher: HookMatcher = { hooks };

        if (typeof matcherObj.matcher === "string") {
          matcher.matcher = matcherObj.matcher;
        }

        matchers.push(matcher);
      }

      if (matchers.length > 0) {
        allEvents.push({
          event: eventName,
          matchers,
          scope: file.scope,
          sourcePath: file.expectedPath,
        });
      }
    }
  }

  // Sort events alphabetically by name
  allEvents.sort((a, b) => a.event.localeCompare(b.event));

  // Compute configured vs unconfigured events
  const configuredSet = new Set(allEvents.map((e) => e.event));
  const configuredEvents = [...configuredSet].sort();
  const unconfiguredEvents = KNOWN_HOOK_EVENTS.filter(
    (e) => !configuredSet.has(e)
  ).sort();

  // Scan ~/.claude/hooks/ for script files
  const hookScripts: HookScript[] = [];
  const hooksDir = nodePath.join(getGlobalClaudeDir(), "hooks");
  try {
    const entries = await fs.readdir(hooksDir, { withFileTypes: true });
    const scriptPromises = entries
      .filter((e) => e.isFile())
      .map(async (entry) => {
        const filePath = nodePath.join(hooksDir, entry.name);
        try {
          const [content, stat] = await Promise.all([
            fs.readFile(filePath, "utf-8"),
            fs.stat(filePath),
          ]);
          return {
            fileName: entry.name,
            path: filePath,
            sizeBytes: stat.size,
            content,
          } satisfies HookScript;
        } catch {
          return null;
        }
      });
    const results = await Promise.all(scriptPromises);
    for (const script of results) {
      if (script) hookScripts.push(script);
    }
    hookScripts.sort((a, b) => a.fileName.localeCompare(b.fileName));
  } catch {
    // hooks directory doesn't exist
  }

  return {
    events: allEvents,
    availableEvents: [...KNOWN_HOOK_EVENTS].sort(),
    configuredEvents,
    unconfiguredEvents,
    hookScripts,
  };
}

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns extracted fields or empty object if no frontmatter.
 */
export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && value) fields[key] = value;
  }
  return fields;
}

/**
 * Read a markdown file and extract metadata (frontmatter, content, size).
 */
async function readMdWithMeta(filePath: string): Promise<{
  content: string;
  sizeBytes: number;
  description?: string;
} | null> {
  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ]);
    const fm = parseFrontmatter(content);
    return {
      content,
      sizeBytes: stat.size,
      description: fm.description || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extract all custom commands and skills from scanned configuration files.
 *
 * Scans commands-dir and skills-dir type entries from the file scan,
 * reads .md files from each directory, and creates CommandEntry objects.
 * Optionally also scans installed plugin directories for commands/skills.
 *
 * @param files - All scanned configuration files from a scan() call
 * @param plugins - Optional list of plugins to scan for commands/skills
 * @returns CommandsResult with all discovered commands
 */
export async function extractCommands(
  files: ConfigFile[],
  plugins?: PluginInfo[]
): Promise<CommandsResult> {
  const allCommands: CommandEntry[] = [];

  // Filter for commands directories that exist and are readable
  const commandsDirs = files.filter(
    (f) => f.type === "commands-dir" && f.exists && f.readable
  );

  for (const dir of commandsDirs) {
    try {
      const entries = await fs.readdir(dir.expectedPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md")) {
          // Direct .md command file
          const filePath = nodePath.join(dir.expectedPath, entry.name);
          const meta = await readMdWithMeta(filePath);
          allCommands.push({
            name: entry.name.replace(/\.md$/, ""),
            path: filePath,
            scope: dir.scope,
            source: "command",
            description: meta?.description,
            content: meta?.content,
            sizeBytes: meta?.sizeBytes,
          });
        } else if (entry.isDirectory()) {
          // Skill directory — check for .md files inside
          try {
            const skillEntries = await fs.readdir(
              nodePath.join(dir.expectedPath, entry.name),
              { withFileTypes: true }
            );

            for (const skillEntry of skillEntries) {
              if (skillEntry.isFile() && skillEntry.name.endsWith(".md")) {
                const filePath = nodePath.join(
                  dir.expectedPath,
                  entry.name,
                  skillEntry.name
                );
                const meta = await readMdWithMeta(filePath);
                allCommands.push({
                  name: `${entry.name}:${skillEntry.name.replace(/\.md$/, "")}`,
                  path: filePath,
                  scope: dir.scope,
                  source: "command",
                  description: meta?.description,
                  content: meta?.content,
                  sizeBytes: meta?.sizeBytes,
                });
              }
            }
          } catch {
            // Skip unreadable skill directories
          }
        }
      }
    } catch {
      // Skip unreadable commands directories
    }
  }

  // Scan skills directories (e.g., ~/.claude/skills/)
  const skillsDirs = files.filter(
    (f) => f.type === "skills-dir" && f.exists && f.readable
  );

  for (const dir of skillsDirs) {
    try {
      const entries = await fs.readdir(dir.expectedPath, {
        withFileTypes: true,
      });

      const skillPromises = entries
        .filter((e) => e.isDirectory())
        .map(async (entry) => {
          // Each skill is a directory containing SKILL.md (or any .md file)
          const skillDir = nodePath.join(dir.expectedPath, entry.name);
          try {
            const skillFiles = await fs.readdir(skillDir, { withFileTypes: true });
            const mdFile = skillFiles.find(
              (f) => f.isFile() && f.name.endsWith(".md")
            );
            if (!mdFile) return null;
            const filePath = nodePath.join(skillDir, mdFile.name);
            const meta = await readMdWithMeta(filePath);
            return {
              name: entry.name,
              path: filePath,
              scope: dir.scope,
              source: "skill" as const,
              description: meta?.description,
              content: meta?.content,
              sizeBytes: meta?.sizeBytes,
            } satisfies CommandEntry;
          } catch {
            return null;
          }
        });

      const results = await Promise.all(skillPromises);
      for (const skill of results) {
        if (skill) allCommands.push(skill);
      }
    } catch {
      // Skip unreadable skills directories
    }
  }

  // Scan installed plugin directories for commands and skills
  if (plugins) {
    const pluginPromises = plugins
      .filter((p) => p.installed && p.enabled)
      .map(async (plugin) => {
        const pluginCommands: CommandEntry[] = [];
        const pluginDir = plugin.pluginDir;

        // Scan commands/*.md
        try {
          const commandsDir = nodePath.join(pluginDir, "commands");
          const entries = await fs.readdir(commandsDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith(".md")) {
              const filePath = nodePath.join(commandsDir, entry.name);
              const meta = await readMdWithMeta(filePath);
              pluginCommands.push({
                name: `${plugin.name}:${entry.name.replace(/\.md$/, "")}`,
                path: filePath,
                scope: plugin.scope,
                source: "plugin",
                description: meta?.description,
                content: meta?.content,
                sizeBytes: meta?.sizeBytes,
              });
            }
          }
        } catch {
          // No commands directory
        }

        // Scan skills/*/*.md — use directory name as skill name, skip duplicates from commands/
        const seenNames = new Set(pluginCommands.map((c) => c.name));
        try {
          const skillsDir = nodePath.join(pluginDir, "skills");
          const skillDirs = await fs.readdir(skillsDir, { withFileTypes: true });
          for (const skillDir of skillDirs) {
            if (!skillDir.isDirectory()) continue;
            const skillName = `${plugin.name}:${skillDir.name}`;
            if (seenNames.has(skillName)) continue;
            try {
              const skillFiles = await fs.readdir(
                nodePath.join(skillsDir, skillDir.name),
                { withFileTypes: true }
              );
              const mdFile = skillFiles.find(
                (f) => f.isFile() && f.name.endsWith(".md")
              );
              if (mdFile) {
                const filePath = nodePath.join(skillsDir, skillDir.name, mdFile.name);
                const meta = await readMdWithMeta(filePath);
                pluginCommands.push({
                  name: skillName,
                  path: filePath,
                  scope: plugin.scope,
                  source: "plugin",
                  description: meta?.description,
                  content: meta?.content,
                  sizeBytes: meta?.sizeBytes,
                });
                seenNames.add(skillName);
              }
            } catch {
              // Skip unreadable skill subdirectory
            }
          }
        } catch {
          // No skills directory
        }

        return pluginCommands;
      });

    const pluginResults = await Promise.all(pluginPromises);
    for (const commands of pluginResults) {
      allCommands.push(...commands);
    }
  }

  // Sort by scope priority then by name
  allCommands.sort((a, b) => {
    const aPriority = SCOPE_PRIORITY[a.scope] ?? 99;
    const bPriority = SCOPE_PRIORITY[b.scope] ?? 99;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.name.localeCompare(b.name);
  });

  return {
    commands: allCommands,
  };
}
