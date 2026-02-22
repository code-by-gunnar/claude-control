import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchStatus,
  fetchScan,
  fetchSettings,
  fetchMemory,
  fetchMcp,
  fetchHooks,
  fetchPermissions,
  fetchHealth,
  type StatusSummary,
  type ScanResult,
  type SettingsResult,
  type MemoryFile,
  type McpResult,
  type HooksResult,
  type PermissionsResult,
  type HealthResult,
} from "../lib/api";

interface CardData {
  label: string;
  value: number | string;
  detail: string;
  link: string | null;
}

export function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [configExpanded, setConfigExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [scan, status, settings, memory, mcp, hooks, permissions, healthResult] =
          await Promise.all([
            fetchScan(),
            fetchStatus(),
            fetchSettings(),
            fetchMemory(),
            fetchMcp(),
            fetchHooks(),
            fetchPermissions(),
            fetchHealth().catch(() => null),
          ]);

        if (cancelled) return;

        setScanResult(scan);
        setHealth(healthResult);
        const settingsCount = settings.settings?.length ?? 0;
        const memoryCount = memory?.length ?? 0;
        const serversCount = mcp.servers?.length ?? 0;
        const hooksCount = hooks.configuredEvents?.length ?? 0;
        const permissionsCount = permissions.effective?.length ?? 0;

        const cardData: CardData[] = [
          {
            label: "Config Files",
            value: status.found,
            detail: `${status.found} found of ${status.total} paths`,
            link: null,
          },
          {
            label: "Settings",
            value: settingsCount,
            detail: `${settingsCount} resolved key${settingsCount !== 1 ? "s" : ""}`,
            link: "/settings",
          },
          {
            label: "CLAUDE.md Files",
            value: memoryCount,
            detail: `${memoryCount} memory file${memoryCount !== 1 ? "s" : ""} active`,
            link: "/memory",
          },
          {
            label: "MCP Servers",
            value: serversCount,
            detail: `${serversCount} server${serversCount !== 1 ? "s" : ""} configured`,
            link: "/mcp",
          },
          {
            label: "Hooks",
            value: hooksCount,
            detail: `${hooksCount} event${hooksCount !== 1 ? "s" : ""} with hooks`,
            link: "/hooks",
          },
          {
            label: "Permissions",
            value: permissionsCount,
            detail: `${permissionsCount} permission rule${permissionsCount !== 1 ? "s" : ""}`,
            link: "/permissions",
          },
        ];

        // Health card is added separately since it has a special display
        // (stored in health state, rendered below the grid)

        setCards(cardData);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load data");
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
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">
          Overview
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading dashboard data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Overview</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
              <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) =>
              card.link ? (
                <Link
                  key={card.label}
                  to={card.link}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{card.detail}</p>
                </Link>
              ) : (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => setConfigExpanded(!configExpanded)}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">
                      {card.label}
                    </p>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${configExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{card.detail}</p>
                </button>
              )
            )}
          </div>

          {/* Health score card */}
          {health && (
            <Link
              to="/health"
              className="mt-4 bg-white rounded-lg shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition-all group flex items-center gap-5"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ring-4 shrink-0 ${
                  health.grade === "A" || health.grade === "B"
                    ? "ring-emerald-100"
                    : health.grade === "C"
                      ? "ring-yellow-100"
                      : "ring-red-100"
                }`}
              >
                <span
                  className={`text-2xl font-bold ${
                    health.grade === "A" || health.grade === "B"
                      ? "text-emerald-600"
                      : health.grade === "C"
                        ? "text-yellow-600"
                        : "text-red-600"
                  }`}
                >
                  {Math.round(health.overallScore)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">
                    Health Score
                  </p>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      health.grade === "A" || health.grade === "B"
                        ? "bg-emerald-100 text-emerald-700"
                        : health.grade === "C"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {health.grade}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1 truncate">{health.summary}</p>
                {health.recommendations.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {health.recommendations.length} recommendation{health.recommendations.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <svg
                className="w-5 h-5 text-slate-400 shrink-0 group-hover:text-blue-500 transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          )}

          {configExpanded && scanResult && (
            <div className="mt-4 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-medium text-slate-700">
                  All Config Paths ({scanResult.files.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Project: {scanResult.projectDir}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {scanResult.files.map((file) => (
                  <div key={file.expectedPath} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${file.exists ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className="text-xs font-medium text-slate-500 w-16 shrink-0">{file.scope}</span>
                    <span className="text-xs text-slate-400 w-20 shrink-0">{file.type}</span>
                    <span className="text-slate-700 font-mono text-xs truncate" title={file.expectedPath}>{file.expectedPath}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
