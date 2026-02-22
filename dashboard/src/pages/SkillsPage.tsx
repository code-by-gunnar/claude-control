import { useEffect, useState } from "react";
import {
  fetchCommands,
  type CommandsResult,
  type CommandEntry,
} from "../lib/api";

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


function CommandRow({ command, showPrefix }: { command: CommandEntry; showPrefix?: boolean }) {
  const colonIdx = command.name.indexOf(":");
  const displayName = showPrefix || colonIdx < 0 ? command.name : command.name.slice(colonIdx + 1);
  return (
    <div className="px-4 py-2.5 flex items-center gap-4 border-b border-slate-100 last:border-b-0">
      <span className="font-mono text-sm text-slate-900 font-medium min-w-[140px]">
        {displayName}
      </span>
      <span className="flex-1" />
      <ScopeBadge scope={command.scope} />
    </div>
  );
}

/** Group skills by prefix (part before `:`) */
function groupSkills(skills: CommandEntry[]): { prefix: string; items: CommandEntry[] }[] {
  const groups = new Map<string, CommandEntry[]>();
  for (const skill of skills) {
    const colonIdx = skill.name.indexOf(":");
    const prefix = colonIdx > 0 ? skill.name.slice(0, colonIdx) : skill.name;
    const existing = groups.get(prefix);
    if (existing) {
      existing.push(skill);
    } else {
      groups.set(prefix, [skill]);
    }
  }
  // Sort groups alphabetically, but put larger groups first within same letter
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([prefix, items]) => ({ prefix, items }));
}

function SkillGroup({ group }: { group: { prefix: string; items: CommandEntry[] } }) {
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
        <div className="bg-slate-50/50 border-t border-slate-100">
          {group.items.map((cmd) => (
            <CommandRow
              key={`${cmd.name}-${cmd.scope}-${cmd.path}`}
              command={cmd}
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

  useEffect(() => {
    let cancelled = false;

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
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const commands = commandsData?.commands ?? [];
  const customCommands = commands.filter((c) => !c.name.includes(":"));
  const skills = commands.filter((c) => c.name.includes(":"));
  const skillGroups = groupSkills(skills);

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
        Custom slash commands and skills
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({customCommands.length} command{customCommands.length !== 1 ? "s" : ""},
            {" "}{skills.length} skill{skills.length !== 1 ? "s" : ""})
          </span>
        )}
      </p>

      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p>
          <strong>Custom commands</strong> are prompt files in <code className="font-mono text-xs bg-blue-100 px-1 rounded">.claude/commands/</code> that
          you invoke with <code className="font-mono text-xs bg-blue-100 px-1 rounded">/command-name</code>.
          {" "}<strong>Skills</strong> (shown as <code className="font-mono text-xs bg-blue-100 px-1 rounded">name:skill</code>) come
          from <strong>plugins</strong> and provide reusable capabilities.
          Both are slash-command shortcuts for common workflows.
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
          {/* Custom Commands Section */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Custom Commands
              {customCommands.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({customCommands.length})
                </span>
              )}
            </h2>
            {customCommands.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
                No custom commands configured
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-4 py-2 flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                  <span className="flex-1">Name</span>
                  <span className="shrink-0">Scope</span>
                </div>
                {customCommands.map((cmd) => (
                  <CommandRow
                    key={`${cmd.name}-${cmd.scope}-${cmd.path}`}
                    command={cmd}
                    showPrefix
                  />
                ))}
              </div>
            )}
          </section>

          {/* Skills Section */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Skills
              {skills.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({skillGroups.length} group{skillGroups.length !== 1 ? "s" : ""}, {skills.length} total)
                </span>
              )}
            </h2>
            {skills.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
                No skills configured
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-4 py-2 flex gap-3 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                  <span className="w-4" />
                  <span className="flex-1">Group</span>
                  <span className="shrink-0">Scope</span>
                </div>
                {skillGroups.map((group) => (
                  <SkillGroup key={group.prefix} group={group} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
