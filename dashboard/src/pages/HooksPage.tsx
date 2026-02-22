import { useEffect, useState } from "react";
import {
  fetchHooks,
  fetchCommands,
  type HooksResult,
  type HookEvent,
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

/** Status indicator dot */
function StatusDot({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
        configured ? "bg-emerald-500" : "bg-slate-300"
      }`}
      title={configured ? "Configured" : "Unconfigured"}
    />
  );
}

/** A single event row in the event catalog */
function EventRow({
  eventName,
  entries,
}: {
  eventName: string;
  entries: HookEvent[];
}) {
  const [expanded, setExpanded] = useState(false);
  const configured = entries.length > 0;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => configured && setExpanded(!expanded)}
        className={`w-full text-left px-4 py-3 transition-colors flex items-center gap-4 ${
          configured
            ? "hover:bg-slate-50 cursor-pointer"
            : "cursor-default"
        }`}
      >
        <span className="text-slate-400 text-xs w-4 shrink-0">
          {configured ? (expanded ? "\u25BC" : "\u25B6") : ""}
        </span>
        <StatusDot configured={configured} />
        <span
          className={`font-mono text-sm font-medium ${
            configured ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {eventName}
        </span>
        <span className="flex-1" />
        {configured && (
          <span className="text-xs text-slate-400">
            {entries.length} source{entries.length !== 1 ? "s" : ""}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-12 bg-slate-50/50">
          <div className="space-y-3">
            {entries.map((entry, entryIdx) => (
              <div
                key={`${entry.scope}-${entry.sourcePath}-${entryIdx}`}
                className="bg-white border border-slate-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ScopeBadge scope={entry.scope} />
                  <span
                    className="text-xs text-slate-400 truncate"
                    title={entry.sourcePath}
                  >
                    {shortenPath(entry.sourcePath)}
                  </span>
                </div>

                {entry.matchers.length > 0 ? (
                  <div className="space-y-1.5">
                    {entry.matchers.map((matcherEntry, matcherIdx) => (
                      <div key={matcherIdx} className="space-y-1">
                        {matcherEntry.matcher && (
                          <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded inline-block">
                            {matcherEntry.matcher}
                          </span>
                        )}
                        {matcherEntry.hooks.map((hook, hookIdx) => (
                          <div
                            key={hookIdx}
                            className="flex items-start gap-2 text-sm"
                          >
                            <span className="text-slate-400 text-xs mt-0.5 shrink-0">
                              {"\u2192"}
                            </span>
                            <span className="font-mono text-xs text-slate-800 break-all">
                              {hook.command}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No matchers defined
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Type badge for command vs skill */
const commandTypeColors: Record<string, string> = {
  command: "bg-blue-100 text-blue-700",
  skill: "bg-violet-100 text-violet-700",
};

function CommandTypeBadge({ type }: { type: string }) {
  const colors = commandTypeColors[type] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      {type}
    </span>
  );
}

function CommandRow({ command }: { command: CommandEntry }) {
  const derivedType = command.name.includes(":") ? "skill" : "command";
  return (
    <div className="px-4 py-3 flex items-center gap-4 border-b border-slate-100 last:border-b-0">
      <span className="font-mono text-sm text-slate-900 font-medium min-w-[160px]">
        {command.name}
      </span>
      <CommandTypeBadge type={derivedType} />
      <span className="flex-1" />
      <ScopeBadge scope={command.scope} />
      <span
        className="text-xs text-slate-400 hidden lg:inline truncate max-w-[200px]"
        title={command.path}
      >
        {shortenPath(command.path)}
      </span>
    </div>
  );
}

export function HooksPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hooksData, setHooksData] = useState<HooksResult | null>(null);
  const [commandsData, setCommandsData] = useState<CommandsResult | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [hooks, commands] = await Promise.all([
          fetchHooks(),
          fetchCommands(),
        ]);
        if (cancelled) return;
        setHooksData(hooks);
        setCommandsData(commands);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load hooks data"
        );
        setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const allEvents = hooksData?.availableEvents ?? [];
  const events = hooksData?.events ?? [];
  const commands = commandsData?.commands ?? [];

  // Group hook entries by event name for easy lookup
  const eventEntries: Record<string, HookEvent[]> = {};
  for (const event of allEvents) {
    eventEntries[event] = events.filter((e) => e.event === event);
  }

  const configuredCount = hooksData?.configuredEvents?.length ?? 0;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Hooks</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading hooks data</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Hooks</h1>
      <p className="text-sm text-slate-500 mb-6">
        Hook events and custom commands
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({configuredCount} of {allEvents.length} events configured)
          </span>
        )}
      </p>

      {loading ? (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="px-4 py-3 border-b border-slate-100 animate-pulse flex gap-4"
              >
                <div className="h-4 bg-slate-200 rounded w-4" />
                <div className="h-3 bg-slate-200 rounded-full w-3" />
                <div className="h-4 bg-slate-200 rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Event Catalog */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Event Catalog
            </h2>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              {/* Header */}
              <div className="px-4 py-2 flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                <span className="w-4" />
                <span className="w-3" />
                <span className="flex-1">Event</span>
                <span className="w-20 text-right">Sources</span>
              </div>

              {allEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No hook events available
                </div>
              ) : (
                allEvents.map((eventName) => (
                  <EventRow
                    key={eventName}
                    eventName={eventName}
                    entries={eventEntries[eventName] ?? []}
                  />
                ))
              )}
            </div>
          </section>

          {/* Commands Section */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Custom Commands
              {commands.filter((c) => !c.name.includes(":")).length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({commands.filter((c) => !c.name.includes(":")).length})
                </span>
              )}
            </h2>
            {commands.filter((c) => !c.name.includes(":")).length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
                No custom commands configured
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-4 py-2 flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                  <span className="min-w-[160px]">Name</span>
                  <span className="w-16">Type</span>
                  <span className="flex-1" />
                  <span className="w-16">Scope</span>
                  <span className="hidden lg:inline w-[200px]">Location</span>
                </div>
                {commands
                  .filter((c) => !c.name.includes(":"))
                  .map((cmd) => (
                    <CommandRow
                      key={`${cmd.name}-${cmd.scope}-${cmd.path}`}
                      command={cmd}
                    />
                  ))}
              </div>
            )}
          </section>

          {/* Skills Section */}
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">
              Skills
              {commands.filter((c) => c.name.includes(":")).length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({commands.filter((c) => c.name.includes(":")).length})
                </span>
              )}
            </h2>
            {commands.filter((c) => c.name.includes(":")).length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
                No skills configured
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="px-4 py-2 flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                  <span className="min-w-[160px]">Name</span>
                  <span className="w-16">Type</span>
                  <span className="flex-1" />
                  <span className="w-16">Scope</span>
                  <span className="hidden lg:inline w-[200px]">Location</span>
                </div>
                {commands
                  .filter((c) => c.name.includes(":"))
                  .map((cmd) => (
                    <CommandRow
                      key={`${cmd.name}-${cmd.scope}-${cmd.path}`}
                      command={cmd}
                    />
                  ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
