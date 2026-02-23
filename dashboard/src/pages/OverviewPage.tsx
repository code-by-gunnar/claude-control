import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useRefresh } from "../lib/refresh-context";
import {
  fetchStatus,
  fetchScan,
  fetchSettings,
  fetchMemory,
  fetchMcp,
  fetchHooks,
  fetchPermissions,
  fetchPlugins,
  fetchAgents,
  fetchCommands,
  fetchAccount,
  type ScanResult,
  type AccountInfo,
} from "../lib/api";
import { InfoBubble } from "../components/InfoBubble";
import { ErrorState } from "../components/ErrorState";

function subscriptionBadgeColors(sub: string | null): string {
  if (!sub) return "bg-slate-100 text-slate-500";
  const lower = sub.toLowerCase();
  if (lower.includes("max")) return "bg-purple-100 text-purple-700";
  if (lower === "pro") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-500";
}

export function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [configExpanded, setConfigExpanded] = useState(false);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const { refreshKey, setRefreshing, triggerRefresh } = useRefresh();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRefreshing(true);

    // Fetch account info separately — non-critical, should not block main data
    setAccountLoading(true);
    fetchAccount()
      .then((info) => {
        if (!cancelled) setAccount(info);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      })
      .finally(() => {
        if (!cancelled) setAccountLoading(false);
      });

    async function loadData() {
      try {
        const [
          scan,
          status,
          settings,
          memory,
          mcp,
          hooks,
          permissions,
          plugins,
          agents,
          commands,
        ] = await Promise.all([
          fetchScan(),
          fetchStatus(),
          fetchSettings(),
          fetchMemory(),
          fetchMcp(),
          fetchHooks(),
          fetchPermissions(),
          fetchPlugins(),
          fetchAgents(),
          fetchCommands(),
        ]);

        if (cancelled) return;

        setScanResult(scan);

        const settingsCount = settings.settings?.length ?? 0;
        const memoryCount = memory?.length ?? 0;
        const serversCount = mcp.servers?.length ?? 0;
        const duplicateCount = mcp.duplicates?.length ?? 0;
        const hooksConfigured = hooks.configuredEvents?.length ?? 0;
        const totalEvents = hooks.availableEvents?.length ?? 6;
        const permEffective = permissions.effective ?? [];
        const allowCount = permEffective.filter((p) => p.effectiveRule === "allow").length;
        const denyCount = permEffective.filter((p) => p.effectiveRule === "deny").length;
        const askCount = permEffective.filter((p) => p.effectiveRule === "ask").length;
        const enabledPlugins = plugins.enabledCount ?? 0;
        const installedPlugins = plugins.installedCount ?? 0;
        const agentCount = agents.totalCount ?? 0;
        const allCommands = commands.commands ?? [];
        const skillCount = allCommands.filter((c) => c.source === "skill").length;
        const pluginCmdCount = allCommands.filter((c) => c.source === "plugin").length;
        const cmdCount = allCommands.filter((c) => c.source === "command" || !c.source).length;

        const cardData: CardData[] = [
          {
            label: "Config Files",
            value: status.found,
            detail: `${status.found} found of ${status.total} paths`,
            link: null,
            info: "JSON and JSONC config files across managed, user, project, and local scopes.",
          },
          {
            label: "Settings",
            value: settingsCount,
            detail: `${settingsCount} resolved key${settingsCount !== 1 ? "s" : ""}`,
            link: "/settings",
            info: "Effective settings after merging all scopes. Higher scopes override lower ones.",
          },
          {
            label: "CLAUDE.md Files",
            value: memoryCount,
            detail: `${memoryCount} memory file${memoryCount !== 1 ? "s" : ""} active`,
            link: "/memory",
            info: "Markdown instruction files that Claude reads for project context and rules.",
          },
          {
            label: "MCP Servers",
            value: serversCount,
            detail: `${serversCount} server${serversCount !== 1 ? "s" : ""}${duplicateCount > 0 ? ` (${duplicateCount} duplicate${duplicateCount !== 1 ? "s" : ""})` : ""}`,
            link: "/mcp",
            info: "Model Context Protocol servers providing tools and resources to Claude.",
            badge: duplicateCount > 0 ? { text: `${duplicateCount} dup`, color: "yellow" } : undefined,
          },
          {
            label: "Plugins",
            value: enabledPlugins,
            detail: `${enabledPlugins} enabled, ${installedPlugins} installed`,
            link: "/plugins",
            info: "Marketplace plugins that add MCP servers, skills, or both.",
          },
          {
            label: "Agents",
            value: agentCount,
            detail: `${agentCount} agent file${agentCount !== 1 ? "s" : ""}`,
            link: "/agents",
            info: "Custom agent definitions with specific tools, models, and instructions.",
          },
          {
            label: "Skills & Commands",
            value: allCommands.length,
            detail: `${cmdCount} command${cmdCount !== 1 ? "s" : ""}, ${skillCount} skill${skillCount !== 1 ? "s" : ""}, ${pluginCmdCount} plugin`,
            link: "/skills",
            info: "Slash commands and skills available via /name. Sourced from local files and plugins.",
          },
          {
            label: "Hooks",
            value: hooksConfigured,
            detail: `${hooksConfigured} of ${totalEvents} events configured`,
            link: "/hooks",
            info: "Shell commands that run automatically in response to Claude Code events.",
          },
          {
            label: "Permissions",
            value: permEffective.length,
            detail: `${allowCount} allow, ${denyCount} deny, ${askCount} ask`,
            link: "/permissions",
            info: "Tool permission rules. Deny always wins, then ask, then allow.",
          },
        ];

        setCards(cardData);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load data");
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
          Overview
        </h1>
        <ErrorState
          title="Error loading dashboard data"
          message={error}
          onRetry={() => triggerRefresh()}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Overview</h1>
      <p className="text-sm text-slate-500 mb-6">
        At-a-glance summary of your Claude Code configuration
        {!loading && scanResult && (
          <span className="ml-1 text-slate-400">
            &mdash; {scanResult.projectDir}
          </span>
        )}
      </p>

      {/* Account info bar */}
      <div className="mb-4">
        {accountLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2.5 animate-pulse flex items-center gap-3">
            <div className="h-3 bg-slate-200 rounded w-14" />
            <div className="h-5 bg-slate-100 rounded w-16" />
            <div className="h-5 bg-slate-100 rounded w-20" />
          </div>
        ) : account && (account.subscriptionType || account.rateLimitTier) ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Account</span>
            {account.subscriptionType && (
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${subscriptionBadgeColors(account.subscriptionType)}`}>
                {account.subscriptionType}
              </span>
            )}
            {account.rateLimitTier && (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {account.rateLimitTier}
              </span>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2.5">
            <span className="text-xs text-slate-400">
              Account info unavailable &mdash; sign in to Claude Code to see subscription details
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
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
          {/* Stat Cards Grid (3x3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => {
              const content = (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">
                        {card.label}
                      </p>
                      <InfoBubble text={card.info} />
                    </div>
                    {card.badge && (
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          card.badge.color === "yellow"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {card.badge.text}
                      </span>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mt-1">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{card.detail}</p>
                </>
              );

              return card.link ? (
                <Link
                  key={card.label}
                  to={card.link}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={card.label}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
                >
                  {content}
                </div>
              );
            })}
          </div>

          {/* Config Files Expandable */}
          {scanResult && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setConfigExpanded(!configExpanded)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${configExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
                Show all config paths ({scanResult.files.length})
              </button>

              {configExpanded && (
                <div className="mt-3 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
