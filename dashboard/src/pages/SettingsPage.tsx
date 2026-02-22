import { useEffect, useState } from "react";
import {
  fetchSettings,
  type ResolvedSetting,
  type SettingsResult,
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

/** Format a value for display — objects/arrays as JSON, primitives as-is */
function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
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

function SettingRow({ setting }: { setting: ResolvedSetting }) {
  const [expanded, setExpanded] = useState(false);
  const hasOverrides = setting.overrides.length > 1;
  const isObjectValue = typeof setting.effectiveValue === "object" && setting.effectiveValue !== null;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-4 group"
      >
        <span className="text-slate-400 mt-0.5 text-xs w-4 shrink-0">
          {hasOverrides ? (expanded ? "\u25BC" : "\u25B6") : "\u00B7"}
        </span>
        <span className="font-mono text-sm text-slate-900 font-medium min-w-[200px] shrink-0">
          {setting.key}
        </span>
        <span className="flex-1 font-mono text-sm text-slate-600 truncate">
          {isObjectValue ? (
            <span className="text-slate-400 italic">
              {"{...}"}
            </span>
          ) : (
            formatValue(setting.effectiveValue)
          )}
        </span>
        <ScopeBadge scope={setting.effectiveScope} />
        <span
          className="text-xs text-slate-400 hidden lg:inline truncate max-w-[200px]"
          title={setting.effectiveSourcePath}
        >
          {shortenPath(setting.effectiveSourcePath)}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-12 bg-slate-50/50">
          {/* Full effective value if it's an object */}
          {isObjectValue && (
            <div className="mb-3">
              <p className="text-xs font-medium text-slate-500 mb-1">
                Effective value:
              </p>
              <pre className="text-xs font-mono bg-white border border-slate-200 rounded p-3 overflow-x-auto text-slate-700">
                {formatValue(setting.effectiveValue)}
              </pre>
            </div>
          )}

          {/* Override chain */}
          <p className="text-xs font-medium text-slate-500 mb-2">
            Override chain ({setting.overrides.length} scope{setting.overrides.length !== 1 ? "s" : ""}):
          </p>
          <div className="space-y-1">
            {setting.overrides.map((override, i) => {
              const isWinner = i === 0;
              return (
                <div
                  key={`${override.scope}-${override.path}`}
                  className={`flex items-start gap-3 px-3 py-2 rounded text-sm ${
                    isWinner
                      ? "bg-white border border-green-200"
                      : "bg-slate-100/50 opacity-60"
                  }`}
                >
                  <span className="mt-0.5 text-sm w-4 shrink-0">
                    {isWinner ? (
                      <span className="text-green-600">{"\u2713"}</span>
                    ) : (
                      <span className="text-slate-400">{"\u2013"}</span>
                    )}
                  </span>
                  <ScopeBadge scope={override.scope} />
                  <span
                    className={`font-mono text-xs flex-1 ${
                      isWinner ? "text-slate-800" : "text-slate-400 line-through"
                    }`}
                  >
                    {formatValue(override.value)}
                  </span>
                  <span
                    className="text-xs text-slate-400 truncate max-w-[250px]"
                    title={override.path}
                  >
                    {shortenPath(override.path)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SettingsResult | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const result = await fetchSettings();
        if (cancelled) return;
        setData(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load settings");
        setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSettings =
    data?.settings?.filter((s) =>
      s.key.toLowerCase().includes(filter.toLowerCase())
    ) ?? [];

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          Settings
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading settings</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Count how many settings have overrides (defined in more than one scope)
  const overriddenCount = data
    ? data.settings.filter((s) => s.overrides.length > 1).length
    : 0;

  // Count unique scopes that contribute settings
  const activeScopes = data
    ? [...new Set(data.settings.map((s) => s.effectiveScope))]
    : [];

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Settings</h1>
      <p className="text-sm text-slate-500 mb-6">
        Resolved configuration from settings.json files
        {!loading && data && (
          <span className="ml-1 text-slate-400">
            ({data.settings.length} setting{data.settings.length !== 1 ? "s" : ""}
            {overriddenCount > 0 && (
              <span>
                , {overriddenCount} overridden
              </span>
            )}
            {activeScopes.length > 0 && (
              <span>
                , {activeScopes.length} scope{activeScopes.length !== 1 ? "s" : ""}
              </span>
            )}
            )
          </span>
        )}
      </p>

      {/* Explainer */}
      {!loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
          <p className="mb-2">
            <strong>Settings</strong> control Claude Code behavior — model
            preferences, allowed tools, editor integration, and more. They
            are defined in{" "}
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">
              settings.json
            </code>{" "}
            files at different scope levels:
          </p>
          <ul className="list-disc pl-5 space-y-1 mb-2">
            <li>
              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                managed
              </span>{" "}
              &mdash; organization defaults set by your admin
            </li>
            <li>
              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                user
              </span>{" "}
              &mdash; your personal preferences in{" "}
              <code className="font-mono text-xs bg-blue-100 px-1 rounded">
                ~/.claude/settings.json
              </code>
            </li>
            <li>
              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                project
              </span>{" "}
              &mdash; shared team settings in{" "}
              <code className="font-mono text-xs bg-blue-100 px-1 rounded">
                .claude/settings.json
              </code>
            </li>
            <li>
              <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                local
              </span>{" "}
              &mdash; your local overrides in{" "}
              <code className="font-mono text-xs bg-blue-100 px-1 rounded">
                .claude/settings.local.json
              </code>
            </li>
          </ul>
          <p className="text-blue-700 text-xs">
            Higher scopes override lower ones (local &gt; project &gt; user &gt;
            managed). Click a row with the{" "}
            <span className="text-slate-500">{"\u25B6"}</span> indicator to see
            its full override chain.
          </p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 border-b border-slate-100 animate-pulse flex gap-4"
            >
              <div className="h-4 bg-slate-200 rounded w-4" />
              <div className="h-4 bg-slate-200 rounded w-40" />
              <div className="h-4 bg-slate-100 rounded flex-1" />
              <div className="h-4 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Filter input */}
          <div className="mb-4">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter settings..."
              className="w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {filteredSettings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
              {filter
                ? `No settings matching "${filter}"`
                : "No settings found"}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 divide-y divide-slate-100">
              {/* Header */}
              <div className="px-4 py-2 flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                <span className="w-4" />
                <span className="min-w-[200px]">Key</span>
                <span className="flex-1">Value</span>
                <span className="w-16">Scope</span>
                <span className="hidden lg:inline w-[200px]">Source</span>
              </div>

              {filteredSettings.map((setting) => (
                <SettingRow key={setting.key} setting={setting} />
              ))}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3">
            {filteredSettings.length} of {data?.settings?.length ?? 0} settings
            {filter ? ` matching "${filter}"` : ""}
          </p>
        </>
      )}
    </div>
  );
}
