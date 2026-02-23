import { useEffect, useState } from "react";
import { useRefresh } from "../lib/refresh-context";
import {
  fetchMarketplaces,
  type MarketplacesResult,
  type MarketplaceInfo,
  type MarketplacePlugin,
} from "../lib/api";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";

function formatDate(iso: string): string {
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

function StatusBadges({ plugin }: { plugin: MarketplacePlugin }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {plugin.blocked && (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          blocked
        </span>
      )}
      {plugin.enabled && (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          enabled
        </span>
      )}
      {plugin.installed && !plugin.enabled && (
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          installed
        </span>
      )}
    </div>
  );
}

function DirectoryBadge({ directory }: { directory: string }) {
  const isExternal = directory === "external_plugins";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        isExternal
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {isExternal ? "external" : "bundled"}
    </span>
  );
}

function MarketplaceSection({ marketplace }: { marketplace: MarketplaceInfo }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-100"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 font-mono">
              {marketplace.id}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {marketplace.source.repo}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400">
              {marketplace.pluginCount} plugin{marketplace.pluginCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-slate-400">
              Updated {formatDate(marketplace.lastUpdated)}
            </span>
            <span className="text-slate-400 text-xs">
              {collapsed ? "\u25B6" : "\u25BC"}
            </span>
          </div>
        </div>
      </button>

      {!collapsed && (
        <div className="overflow-x-auto">
          {marketplace.plugins.length === 0 ? (
            <p className="p-4 text-sm text-slate-400 text-center">
              No plugins in this marketplace
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Installs</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {marketplace.plugins.map((plugin) => (
                  <tr
                    key={plugin.name}
                    className="border-b border-slate-50 hover:bg-slate-50/50"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-900">
                      {plugin.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <DirectoryBadge directory={plugin.directory} />
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadges plugin={plugin} />
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-slate-500 font-mono">
                      {plugin.installCount != null
                        ? plugin.installCount.toLocaleString()
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate">
                      {plugin.description ?? "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export function MarketplacesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MarketplacesResult | null>(null);
  const { refreshKey, setRefreshing, triggerRefresh } = useRefresh();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRefreshing(true);

    async function loadData() {
      try {
        const result = await fetchMarketplaces();
        if (cancelled) return;
        setData(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load marketplaces"
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

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          Marketplaces
        </h1>
        <ErrorState
          title="Error loading marketplaces"
          message={error}
          onRetry={() => triggerRefresh()}
        />
      </div>
    );
  }

  const marketplaces = data?.marketplaces ?? [];
  const blockedPlugins = data?.blockedPlugins ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
        Marketplaces
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Plugin repositories
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({marketplaces.length} marketplace{marketplaces.length !== 1 ? "s" : ""},{" "}
            {data?.totalPlugins ?? 0} total plugins)
          </span>
        )}
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p>
          <strong>Marketplaces</strong> are plugin repositories configured via{" "}
          <code className="font-mono text-xs bg-blue-100 px-1 rounded">/plugin</code>.
          Each marketplace contains bundled and external plugins that can be
          installed and enabled. This page shows the full catalog across all
          configured marketplaces.
        </p>
      </div>

      {/* Blocked plugins warning */}
      {blockedPlugins.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm text-red-800">
          <p className="font-medium mb-1">
            {blockedPlugins.length} blocked plugin{blockedPlugins.length !== 1 ? "s" : ""}
          </p>
          <ul className="space-y-0.5">
            {blockedPlugins.map((bp) => (
              <li key={bp.plugin} className="text-xs">
                <span className="font-mono">{bp.plugin}</span>
                {bp.reason && (
                  <span className="text-red-600 ml-1">&mdash; {bp.reason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-48 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-64" />
            </div>
          ))}
        </div>
      ) : marketplaces.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
            </svg>
          }
          title="No marketplaces found"
          description="Marketplaces are curated collections of plugins for Claude Code."
          action="Marketplaces are configured automatically when you install plugins"
        />
      ) : (
        <div className="space-y-4">
          {marketplaces.map((marketplace) => (
            <MarketplaceSection key={marketplace.id} marketplace={marketplace} />
          ))}
        </div>
      )}
    </div>
  );
}
