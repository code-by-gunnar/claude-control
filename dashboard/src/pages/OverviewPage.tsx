import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchStatus,
  fetchSettings,
  fetchMemory,
  fetchMcp,
  fetchHooks,
  fetchPermissions,
  type StatusSummary,
  type SettingsResult,
  type MemoryFile,
  type McpResult,
  type HooksResult,
  type PermissionsResult,
} from "../lib/api";

interface CardData {
  label: string;
  value: number | string;
  detail: string;
  link: string;
}

export function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [status, settings, memory, mcp, hooks, permissions] =
          await Promise.all([
            fetchStatus(),
            fetchSettings(),
            fetchMemory(),
            fetchMcp(),
            fetchHooks(),
            fetchPermissions(),
          ]);

        if (cancelled) return;

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
            link: "/",
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
