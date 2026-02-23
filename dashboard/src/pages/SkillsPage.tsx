import { useEffect, useState } from "react";
import { useRefresh } from "../lib/refresh-context";
import {
  fetchCommands,
  type CommandsResult,
  type CommandEntry,
} from "../lib/api";
import { EmptyState } from "../components/EmptyState";

/** Scope badge color mapping */
const scopeColors: Record<string, string> = {
  managed: "bg-slate-200 text-slate-700",
  user: "bg-blue-100 text-blue-700",
  project: "bg-green-100 text-green-700",
  local: "bg-purple-100 text-purple-700",
};

function ScopeBadge({ scope }: { scope: string }) {
  const colors = scopeColors[scope] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      {scope}
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const colors: Record<string, string> = {
    command: "bg-amber-100 text-amber-700",
    skill: "bg-teal-100 text-teal-700",
    plugin: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[source] ?? "bg-slate-100 text-slate-600"}`}
    >
      {source}
    </span>
  );
}

/** Shorten a file path by replacing home directory with ~ */
function shortenPath(fullPath: string): string {
  const home =
    typeof window !== "undefined"
      ? fullPath.replace(/^(\/[^/]+\/[^/]+|[A-Z]:\\Users\\[^\\]+).*$/, "$1")
      : "";
  if (home && fullPath.startsWith(home)) {
    return "~" + fullPath.slice(home.length);
  }
  return fullPath;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** Simple markdown to HTML renderer */
function markdownToHtml(md: string): string {
  // Strip frontmatter
  let text = md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  // Headings
  text = text.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold and italic
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-1 rounded text-xs">$1</code>');
  // Unordered lists
  text = text.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
  // Paragraphs
  text = text.replace(/\n{2,}/g, "</p><p>");
  text = `<p>${text}</p>`;
  text = text.replace(/<p>\s*<(h[1-4]|ul|li)/g, "<$1");
  text = text.replace(/<\/(h[1-4]|ul|li)>\s*<\/p>/g, "</$1>");
  return text;
}

function ContentViewer({ content }: { content: string }) {
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");

  return (
    <div>
      <div className="flex gap-1 mb-2">
        <button
          type="button"
          onClick={() => setViewMode("rendered")}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
            viewMode === "rendered"
              ? "bg-slate-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Rendered
        </button>
        <button
          type="button"
          onClick={() => setViewMode("raw")}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
            viewMode === "raw"
              ? "bg-slate-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Raw
        </button>
      </div>
      {viewMode === "rendered" ? (
        <div
          className="prose prose-sm prose-slate max-w-none max-h-80 overflow-auto text-sm [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_li]:mb-0.5 [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
        />
      ) : (
        <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-80 whitespace-pre-wrap">
          {content}
        </pre>
      )}
    </div>
  );
}

function SkillCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: CommandEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs w-4 shrink-0">
            {expanded ? "\u25BC" : "\u25B6"}
          </span>
          <span className="font-mono text-sm font-semibold text-slate-900">
            {entry.name}
          </span>
          <SourceBadge source={entry.source} />
          <ScopeBadge scope={entry.scope} />
          <span className="flex-1" />
          {entry.sizeBytes != null && (
            <span className="text-xs text-slate-400">
              {formatBytes(entry.sizeBytes)}
            </span>
          )}
        </div>
        {entry.description && (
          <p className="text-xs text-slate-500 mt-1.5 ml-7 line-clamp-2">
            {entry.description}
          </p>
        )}
      </button>

      {expanded && entry.content && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <div className="text-xs text-slate-400 font-mono mb-3 break-all">
            {shortenPath(entry.path)}
          </div>
          <ContentViewer content={entry.content} />
        </div>
      )}
    </div>
  );
}

function CommandRow({ command }: { command: CommandEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-2.5 flex items-center gap-4 hover:bg-slate-50 transition-colors"
      >
        <span className="text-slate-400 text-xs w-4 shrink-0">
          {command.content ? (expanded ? "\u25BC" : "\u25B6") : ""}
        </span>
        <span className="font-mono text-sm text-slate-900 font-medium min-w-[140px]">
          {command.name}
        </span>
        {command.description && (
          <span className="text-xs text-slate-500 truncate flex-1">
            {command.description}
          </span>
        )}
        {!command.description && <span className="flex-1" />}
        {command.sizeBytes != null && (
          <span className="text-xs text-slate-400 shrink-0">
            {formatBytes(command.sizeBytes)}
          </span>
        )}
        <ScopeBadge scope={command.scope} />
      </button>
      {expanded && command.content && (
        <div className="px-4 pb-4 pl-12 bg-slate-50/50 border-t border-slate-100">
          <div className="text-xs text-slate-400 font-mono mb-3 break-all mt-3">
            {shortenPath(command.path)}
          </div>
          <ContentViewer content={command.content} />
        </div>
      )}
    </div>
  );
}

/** Group skills by prefix (part before `:`) */
function groupByPrefix(items: CommandEntry[]): { prefix: string; items: CommandEntry[] }[] {
  const groups = new Map<string, CommandEntry[]>();
  for (const item of items) {
    const colonIdx = item.name.indexOf(":");
    const prefix = colonIdx > 0 ? item.name.slice(0, colonIdx) : item.name;
    const existing = groups.get(prefix);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(prefix, [item]);
    }
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, items]) => ({ prefix, items }));
}

function PluginSkillGroup({
  group,
  expandedSkill,
  onToggle,
}: {
  group: { prefix: string; items: CommandEntry[] };
  expandedSkill: string | null;
  onToggle: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3"
      >
        <span className="text-slate-400 text-xs w-4 shrink-0">
          {expanded ? "\u25BC" : "\u25B6"}
        </span>
        <span className="font-mono text-sm text-slate-900 font-semibold">
          {group.prefix}
        </span>
        <span className="text-xs text-slate-400">
          {group.items.length} skill{group.items.length !== 1 ? "s" : ""}
        </span>
        <span className="flex-1" />
        <ScopeBadge scope={group.items[0].scope} />
      </button>

      {expanded && (
        <div className="bg-slate-50/50 border-t border-slate-100 p-3 space-y-2">
          {group.items.map((item) => (
            <SkillCard
              key={`${item.name}-${item.path}`}
              entry={item}
              expanded={expandedSkill === item.name}
              onToggle={() =>
                onToggle(expandedSkill === item.name ? "" : item.name)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SkillsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commandsData, setCommandsData] = useState<CommandsResult | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const { refreshKey, setRefreshing } = useRefresh();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRefreshing(true);

    async function loadData() {
      try {
        const result = await fetchCommands();
        if (cancelled) return;
        setCommandsData(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load commands data"
        );
        setLoading(false);
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const commands = commandsData?.commands ?? [];
  const customCommands = commands.filter((c) => c.source === "command" && !c.name.includes(":"));
  const commandSkills = commands.filter((c) => c.source === "command" && c.name.includes(":"));
  const userSkills = commands.filter((c) => c.source === "skill");
  const pluginEntries = commands.filter((c) => c.source === "plugin");
  const pluginGroups = groupByPrefix(pluginEntries);

  // For backward compatibility — items without source field
  const untaggedCommands = commands.filter((c) => !c.source && !c.name.includes(":"));
  const untaggedSkills = commands.filter((c) => !c.source && c.name.includes(":"));
  const allCustomCommands = [...customCommands, ...untaggedCommands];
  const allCommandSkills = [...commandSkills, ...untaggedSkills];
  const allCommandSkillGroups = groupByPrefix(allCommandSkills);

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          Commands & Skills
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading commands data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
        Commands & Skills
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Custom slash commands, skills, and plugin capabilities
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({allCustomCommands.length} command{allCustomCommands.length !== 1 ? "s" : ""},
            {" "}{userSkills.length} skill{userSkills.length !== 1 ? "s" : ""},
            {" "}{pluginEntries.length + allCommandSkills.length} plugin)
          </span>
        )}
      </p>

      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p>
          <strong>Commands</strong> are prompt files in <code className="font-mono text-xs bg-blue-100 px-1 rounded">.claude/commands/</code> invoked
          with <code className="font-mono text-xs bg-blue-100 px-1 rounded">/command-name</code>.
          {" "}<strong>Skills</strong> in <code className="font-mono text-xs bg-blue-100 px-1 rounded">.claude/skills/</code> are
          reusable process guides (debugging, TDD, etc.) that Claude uses automatically.
          {" "}<strong>Plugin skills</strong> come from installed plugins.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b border-slate-100 animate-pulse flex gap-4"
              >
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-4 bg-slate-100 rounded w-16" />
                <div className="flex-1" />
                <div className="h-4 bg-slate-200 rounded w-14" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* User Skills Section */}
          {userSkills.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">
                Skills
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({userSkills.length})
                </span>
              </h2>
              <div className="space-y-2">
                {userSkills.map((skill) => (
                  <SkillCard
                    key={`${skill.name}-${skill.path}`}
                    entry={skill}
                    expanded={expandedSkill === skill.name}
                    onToggle={() =>
                      setExpandedSkill(
                        expandedSkill === skill.name ? null : skill.name
                      )
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {/* Custom Commands Section */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Custom Commands
              {allCustomCommands.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({allCustomCommands.length})
                </span>
              )}
            </h2>
            {allCustomCommands.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                }
                title="No custom commands configured"
                description="Custom commands are slash commands you define for frequently used prompts or workflows."
                action={<>Create command files in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">~/.claude/commands/</code> or <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">.claude/commands/</code></>}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-4 py-2 flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                  <span className="w-4" />
                  <span className="flex-1">Name</span>
                  <span className="shrink-0">Scope</span>
                </div>
                {allCustomCommands.map((cmd) => (
                  <CommandRow
                    key={`${cmd.name}-${cmd.scope}-${cmd.path}`}
                    command={cmd}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Command-dir Skills (e.g., gsd:*) */}
          {allCommandSkillGroups.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">
                Command Groups
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({allCommandSkillGroups.length} group{allCommandSkillGroups.length !== 1 ? "s" : ""}, {allCommandSkills.length} total)
                </span>
              </h2>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-4 py-2 flex gap-3 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                  <span className="w-4" />
                  <span className="flex-1">Group</span>
                  <span className="shrink-0">Scope</span>
                </div>
                {allCommandSkillGroups.map((group) => (
                  <PluginSkillGroup
                    key={group.prefix}
                    group={group}
                    expandedSkill={expandedSkill}
                    onToggle={(name) => setExpandedSkill(name || null)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Plugin Skills Section */}
          {pluginGroups.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-slate-800 mb-3">
                Plugin Skills
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({pluginGroups.length} plugin{pluginGroups.length !== 1 ? "s" : ""}, {pluginEntries.length} total)
                </span>
              </h2>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-4 py-2 flex gap-3 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                  <span className="w-4" />
                  <span className="flex-1">Plugin</span>
                  <span className="shrink-0">Scope</span>
                </div>
                {pluginGroups.map((group) => (
                  <PluginSkillGroup
                    key={group.prefix}
                    group={group}
                    expandedSkill={expandedSkill}
                    onToggle={(name) => setExpandedSkill(name || null)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
