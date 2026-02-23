import { useEffect, useState } from "react";
import {
  fetchHooks,
  type HooksResult,
  type HookEvent,
  type HookScript,
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function HookScriptCard({
  script,
  expanded,
  onToggle,
}: {
  script: HookScript;
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-900">
              {script.fileName}
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
              {script.fileName.endsWith(".sh")
                ? "shell"
                : script.fileName.endsWith(".js")
                ? "javascript"
                : "script"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">
              {formatBytes(script.sizeBytes)}
            </span>
            <span className="text-slate-400 text-xs">
              {expanded ? "\u25BC" : "\u25B6"}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          <div className="p-3 bg-slate-50/50 text-xs text-slate-400 font-mono break-all">
            {script.path}
          </div>
          <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 overflow-auto max-h-96 whitespace-pre-wrap">
            {script.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export function HooksPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hooksData, setHooksData] = useState<HooksResult | null>(null);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const hooks = await fetchHooks();
        if (cancelled) return;
        setHooksData(hooks);
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

  // Group hook entries by event name for easy lookup
  const eventEntries: Record<string, HookEvent[]> = {};
  for (const event of allEvents) {
    eventEntries[event] = events.filter((e) => e.event === event);
  }

  const configuredCount = hooksData?.configuredEvents?.length ?? 0;
  const hookScripts = hooksData?.hookScripts ?? [];

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">Hooks</h1>
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
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Hooks</h1>
      <p className="text-sm text-slate-500 mb-4">
        Hook event catalog
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({configuredCount} of {allEvents.length} events configured)
          </span>
        )}
      </p>

      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p>
          <strong>Hooks</strong> run shell commands in response to Claude events (e.g. before/after tool calls, notifications).
          They are configured in <code className="font-mono text-xs bg-blue-100 px-1 rounded">settings.json</code> under
          the <code className="font-mono text-xs bg-blue-100 px-1 rounded">hooks</code> key.
          Green dots indicate events that have at least one hook configured.
        </p>
      </div>

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
      )}

      {/* Hook Scripts Section */}
      {!loading && hookScripts.length > 0 && (
        <>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-8 mb-1">
            Hook Scripts
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Script files in <code className="font-mono text-xs">~/.claude/hooks/</code>
            <span className="ml-1 text-slate-400">
              ({hookScripts.length} script{hookScripts.length !== 1 ? "s" : ""})
            </span>
          </p>
          <div className="space-y-3">
            {hookScripts.map((script) => (
              <HookScriptCard
                key={script.fileName}
                script={script}
                expanded={expandedScript === script.fileName}
                onToggle={() =>
                  setExpandedScript(
                    expandedScript === script.fileName ? null : script.fileName
                  )
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
