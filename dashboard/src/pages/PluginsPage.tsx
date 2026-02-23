import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPlugins, type PluginsResult, type PluginInfo } from "../lib/api";

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

function StatusBadge({ enabled, installed }: { enabled: boolean; installed: boolean }) {
  if (!installed) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        not installed
      </span>
    );
  }
  if (!enabled) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-600">
        disabled
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      enabled
    </span>
  );
}

const pluginTypeColors: Record<string, string> = {
  mcp: "bg-cyan-50 text-cyan-700",
  skills: "bg-amber-50 text-amber-700",
  hybrid: "bg-violet-50 text-violet-700",
};

function PluginTypeBadge({ pluginType }: { pluginType: string }) {
  const colors = pluginTypeColors[pluginType] ?? "bg-slate-100 text-slate-600";
  const label = pluginType === "mcp" ? "MCP" : pluginType === "skills" ? "Skills" : "Hybrid";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      {label}
    </span>
  );
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function PluginCard({ plugin }: { plugin: PluginInfo }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 font-mono">
                {plugin.name}
              </h3>
              <StatusBadge enabled={plugin.enabled} installed={plugin.installed} />
              {plugin.installed && (
                <PluginTypeBadge pluginType={plugin.pluginType} />
              )}
            </div>
            {plugin.description ? (
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                {plugin.description}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                {plugin.marketplace}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {plugin.version && (
              <span className="text-xs text-slate-400 font-mono">
                {plugin.version.length > 12
                  ? plugin.version.slice(0, 8) + "\u2026"
                  : plugin.version}
              </span>
            )}
            <ScopeBadge scope={plugin.scope} />
            <span className="text-slate-400 text-xs">
              {expanded ? "\u25BC" : "\u25B6"}
            </span>
          </div>
        </div>

        {/* Quick summary */}
        {plugin.installed && plugin.mcpServers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {plugin.mcpServers.map((server) => (
              <span
                key={server}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-mono"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3" />
                </svg>
                {server}
              </span>
            ))}
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <dl className="space-y-2 text-sm">
            {plugin.description && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-28 shrink-0">Description:</dt>
                <dd className="text-slate-700">{plugin.description}</dd>
              </div>
            )}
            {plugin.version && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-28 shrink-0">Version:</dt>
                <dd className="font-mono text-xs text-slate-700">{plugin.version}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="text-slate-500 font-medium w-28 shrink-0">Plugin key:</dt>
              <dd className="font-mono text-xs text-slate-700">{plugin.key}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500 font-medium w-28 shrink-0">Marketplace:</dt>
              <dd className="text-slate-700">{plugin.marketplace}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-500 font-medium w-28 shrink-0">Defined in:</dt>
              <dd className="font-mono text-xs text-slate-400 break-all">{plugin.sourcePath}</dd>
            </div>
            {plugin.installed && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-28 shrink-0">Plugin dir:</dt>
                <dd className="font-mono text-xs text-slate-400 break-all">
                  {plugin.installPath ?? plugin.pluginDir}
                </dd>
              </div>
            )}
            {plugin.lastUpdated && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-28 shrink-0">Last updated:</dt>
                <dd className="text-slate-700">{formatDate(plugin.lastUpdated)}</dd>
              </div>
            )}
            {plugin.installedAt && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-28 shrink-0">Installed:</dt>
                <dd className="text-slate-700">{formatDate(plugin.installedAt)}</dd>
              </div>
            )}
            {plugin.mcpServers.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-28 shrink-0">MCP servers:</dt>
                <dd className="text-slate-700">
                  {plugin.mcpServers.length} server{plugin.mcpServers.length !== 1 ? "s" : ""}
                  {" \u2014 "}
                  <Link to="/mcp" className="text-blue-600 hover:text-blue-800 text-xs">
                    view on MCP page
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

export function PluginsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PluginsResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const result = await fetchPlugins();
        if (cancelled) return;
        setData(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load plugins");
        setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          Plugins
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading plugins</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const plugins = data?.plugins ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
        Plugins
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Installed plugin packages
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({data?.enabledCount ?? 0} enabled, {data?.installedCount ?? 0} installed, {data?.totalCount ?? 0} total)
          </span>
        )}
      </p>

      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p>
          <strong>Plugins</strong> are packages installed via <code className="font-mono text-xs bg-blue-100 px-1 rounded">/plugin</code>.
          Each plugin can bundle <strong>MCP servers</strong> (tools), <strong>skills</strong> (slash commands),
          and <strong>settings</strong>. Items from plugins also appear on their respective pages.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse"
            >
              <div className="flex justify-between">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
                <div className="h-5 bg-slate-200 rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : plugins.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
          No plugins found. Install plugins with <code className="font-mono text-xs">/plugin install</code>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => (
            <PluginCard key={plugin.key} plugin={plugin} />
          ))}
        </div>
      )}
    </div>
  );
}
