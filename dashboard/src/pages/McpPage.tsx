import { useEffect, useState } from "react";
import { useRefresh } from "../lib/refresh-context";
import { fetchMcp, type McpResult, type McpServer } from "../lib/api";
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

/** Type badge color mapping */
const typeColors: Record<string, string> = {
  command: "bg-amber-100 text-amber-700",
  http: "bg-cyan-100 text-cyan-700",
};

function TypeBadge({ type }: { type: string }) {
  const colors = typeColors[type] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      {type}
    </span>
  );
}

function DuplicateWarning({
  duplicates,
}: {
  duplicates: McpResult["duplicates"];
}) {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 text-lg leading-none mt-0.5">
          {"\u26A0"}
        </span>
        <div>
          <p className="font-medium text-amber-800 text-sm">
            Duplicate servers detected
          </p>
          <ul className="mt-1 space-y-1">
            {duplicates.map((dup) => (
              <li key={dup.name} className="text-xs text-amber-700">
                <span className="font-mono font-medium">{dup.name}</span>
                {" defined in "}
                {dup.locations
                  .map((loc) => `${loc.scope}: ${loc.sourcePath}`)
                  .join(", ")}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Check if a server comes from a plugin based on its source path */
function getPluginName(sourcePath: string): string | null {
  const normalized = sourcePath.replace(/\\/g, "/");
  // Match both external_plugins/{name}/ and plugins/{name}/ under marketplaces
  const match = normalized.match(
    /\/plugins\/marketplaces\/[^/]+\/(?:external_plugins|plugins)\/([^/]+)\//
  );
  if (match) return match[1];
  // Also match cache paths: cache/{marketplace}/{name}/
  const cacheMatch = normalized.match(
    /\/plugins\/cache\/[^/]+\/([^/]+)\//
  );
  return cacheMatch ? cacheMatch[1] : null;
}

function PluginBadge({ name }: { name: string }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700"
      title={`From plugin: ${name}`}
    >
      plugin
    </span>
  );
}

function ServerRow({ server }: { server: McpServer }) {
  const [expanded, setExpanded] = useState(false);
  const pluginName = getPluginName(server.sourcePath);

  const hasDetails =
    server.command ||
    server.url ||
    (server.args && server.args.length > 0) ||
    (server.env && Object.keys(server.env).length > 0) ||
    (server.headers && Object.keys(server.headers).length > 0);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-4"
      >
        <span className="text-slate-400 text-xs w-4 shrink-0">
          {hasDetails ? (expanded ? "\u25BC" : "\u25B6") : "\u00B7"}
        </span>
        <span className="font-mono text-sm text-slate-900 font-medium min-w-[160px]">
          {server.name}
        </span>
        <div className="flex items-center gap-2">
          <TypeBadge type={server.type} />
          {pluginName && <PluginBadge name={pluginName} />}
          <ScopeBadge scope={server.scope} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-12 bg-slate-50/50">
          <dl className="space-y-2 text-sm">
            {server.command && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-24 shrink-0">
                  Command:
                </dt>
                <dd className="font-mono text-slate-800">{server.command}</dd>
              </div>
            )}

            {server.args && server.args.length > 0 && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-24 shrink-0">
                  Args:
                </dt>
                <dd className="font-mono text-xs text-slate-800 break-all">
                  {server.args.join(" ")}
                </dd>
              </div>
            )}

            {server.url && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-24 shrink-0">
                  URL:
                </dt>
                <dd className="font-mono text-slate-800 break-all">
                  {server.url}
                </dd>
              </div>
            )}

            {server.env && Object.keys(server.env).length > 0 && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-24 shrink-0">
                  Env:
                </dt>
                <dd>
                  <ul className="space-y-0.5">
                    {Object.entries(server.env).map(([key, value]) => (
                      <li key={key} className="text-xs font-mono">
                        <span className="text-slate-800">{key}</span>
                        <span className="text-slate-400">=</span>
                        <span className="text-slate-400 italic">{value}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

            {server.headers && Object.keys(server.headers).length > 0 && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-24 shrink-0">
                  Headers:
                </dt>
                <dd>
                  <ul className="space-y-0.5">
                    {Object.entries(server.headers).map(([key, value]) => (
                      <li key={key} className="text-xs font-mono">
                        <span className="text-slate-800">{key}</span>
                        <span className="text-slate-400">: </span>
                        <span className="text-slate-400 italic">{value}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}

            {server.sourcePath && (
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-24 shrink-0">
                  Source:
                </dt>
                <dd className="font-mono text-xs text-slate-400">
                  {server.sourcePath}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

export function McpPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<McpResult | null>(null);
  const { refreshKey, setRefreshing } = useRefresh();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRefreshing(true);

    async function loadData() {
      try {
        const result = await fetchMcp();
        if (cancelled) return;
        setData(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load MCP data"
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

  const servers = data?.servers ?? [];
  const duplicates = data?.duplicates ?? [];

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          MCP Servers
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading MCP data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
        MCP Servers
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Model Context Protocol servers
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({servers.length} server{servers.length !== 1 ? "s" : ""})
          </span>
        )}
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p>
          <strong>MCP servers</strong> provide tools that Claude can use (file access, web search, databases, etc.).
          They can come from <strong>plugins</strong>, or be configured directly in <code className="font-mono text-xs bg-blue-100 px-1 rounded">.mcp.json</code> and <code className="font-mono text-xs bg-blue-100 px-1 rounded">settings.json</code>.
          Plugin-sourced servers are tagged with a <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">plugin</span> badge.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 border-b border-slate-100 animate-pulse flex gap-4"
            >
              <div className="h-4 bg-slate-200 rounded w-4" />
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-100 rounded w-16" />
              <div className="flex-1" />
              <div className="h-4 bg-slate-200 rounded w-14" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <DuplicateWarning duplicates={duplicates} />

          {servers.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
                </svg>
              }
              title="No MCP servers configured"
              description="MCP servers extend Claude with external tools and data sources like databases, APIs, and file systems."
              action={<>Add servers in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">~/.claude/settings.json</code> under the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">mcpServers</code> key</>}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              {/* Header */}
              <div className="px-4 py-2 flex gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
                <span className="w-4" />
                <span className="min-w-[160px]">Name</span>
                <span>Tags</span>
              </div>

              {servers.map((server) => (
                <ServerRow
                  key={`${server.name}-${server.scope}-${server.sourcePath}`}
                  server={server}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
