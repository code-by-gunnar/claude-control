import { useEffect, useState } from "react";
import {
  fetchPermissions,
  type PermissionsResult,
  type EffectivePermission,
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

/** Rule badge with deny=red, ask=amber, allow=emerald colors */
const ruleColors: Record<string, string> = {
  allow: "bg-emerald-100 text-emerald-700",
  deny: "bg-red-100 text-red-700",
  ask: "bg-amber-100 text-amber-700",
};

function RuleBadge({ rule }: { rule: string }) {
  const colors = ruleColors[rule] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}
    >
      {rule}
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

/** Explain why a rule won the merge */
function winReason(permission: EffectivePermission): string {
  if (permission.effectiveRule === "deny") {
    return "deny always wins regardless of scope";
  }
  if (permission.overrides.length <= 1) {
    return "only rule defined";
  }
  return `higher scope wins (${permission.effectiveScope})`;
}

function PermissionRow({
  permission,
}: {
  permission: EffectivePermission;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasOverrides = permission.overrides.length > 1;

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 group"
      >
        <span className="text-slate-400 text-xs w-4 shrink-0 mt-1">
          {hasOverrides ? (expanded ? "\u25BC" : "\u25B6") : "\u00B7"}
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-mono text-sm text-slate-900 font-medium">
            {permission.tool}
          </span>
          {permission.pattern ? (
            <span className="font-mono text-sm text-slate-500 ml-2 break-all">
              {permission.pattern}
            </span>
          ) : (
            <span className="font-mono text-sm text-slate-300 italic ml-2">*</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <RuleBadge rule={permission.effectiveRule} />
          <ScopeBadge scope={permission.effectiveScope} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-12 bg-slate-50/50">
          {/* Override chain */}
          <p className="text-xs font-medium text-slate-500 mb-2">
            Override chain ({permission.overrides.length} scope
            {permission.overrides.length !== 1 ? "s" : ""}):
          </p>
          <div className="space-y-1">
            {permission.overrides.map((override, i) => {
              const isWinner =
                override.scope === permission.effectiveScope &&
                override.rule === permission.effectiveRule;
              return (
                <div
                  key={`${override.scope}-${override.sourcePath}-${i}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${
                    isWinner
                      ? "bg-white border border-green-200"
                      : "bg-slate-100/50 opacity-60"
                  }`}
                >
                  <span className="w-4 shrink-0 text-sm">
                    {isWinner ? (
                      <span className="text-green-600">{"\u2713"}</span>
                    ) : (
                      <span className="text-slate-400">{"\u2013"}</span>
                    )}
                  </span>
                  <ScopeBadge scope={override.scope} />
                  <RuleBadge rule={override.rule} />
                  <span
                    className={`font-mono text-xs ${
                      isWinner ? "text-slate-700" : "text-slate-400 line-through"
                    }`}
                  >
                    {override.raw}
                  </span>
                  <span className="flex-1" />
                  <span
                    className="text-xs text-slate-400 truncate max-w-[250px]"
                    title={override.sourcePath}
                  >
                    {shortenPath(override.sourcePath)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Why winner won */}
          {hasOverrides && (
            <p className="text-xs text-slate-400 mt-2 italic">
              Winner: {winReason(permission)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function PermissionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PermissionsResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const result = await fetchPermissions();
        if (cancelled) return;
        setData(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load permissions"
        );
        setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const permissions = data?.effective ?? [];

  // Count rules
  const allowCount = permissions.filter(
    (p) => p.effectiveRule === "allow"
  ).length;
  const denyCount = permissions.filter(
    (p) => p.effectiveRule === "deny"
  ).length;
  const askCount = permissions.filter(
    (p) => p.effectiveRule === "ask"
  ).length;

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          Permissions
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading permissions</p>
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
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
        Permissions
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Tool permission rules (deny &gt; ask &gt; allow)
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({permissions.length} rule{permissions.length !== 1 ? "s" : ""})
          </span>
        )}
      </p>

      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p>
          <strong>Permissions</strong> control which tools Claude can use and how.
          Rules are defined in <code className="font-mono text-xs bg-blue-100 px-1 rounded">settings.json</code> under
          {" "}<code className="font-mono text-xs bg-blue-100 px-1 rounded">permissions</code>.
          When multiple scopes define a rule for the same tool, <strong>deny</strong> always wins,
          then <strong>ask</strong> beats <strong>allow</strong>, regardless of scope level.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-3 border-b border-slate-100 animate-pulse flex gap-4"
            >
              <div className="h-4 bg-slate-200 rounded w-4" />
              <div className="h-4 bg-slate-200 rounded w-28" />
              <div className="h-4 bg-slate-100 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded w-14" />
              <div className="flex-1" />
              <div className="h-4 bg-slate-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : permissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
          No permissions configured
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            {/* Header */}
            <div className="px-4 py-2 flex gap-3 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
              <span className="w-4" />
              <span className="flex-1">Tool / Pattern</span>
              <span className="shrink-0">Rule / Scope</span>
            </div>

            {permissions.map((perm) => (
              <PermissionRow
                key={`${perm.tool}-${perm.pattern ?? "*"}`}
                permission={perm}
              />
            ))}
          </div>

          {/* Summary footer */}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
            <span>
              {permissions.length} permission
              {permissions.length !== 1 ? "s" : ""}:
            </span>
            {allowCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                {allowCount} allow
              </span>
            )}
            {denyCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                {denyCount} deny
              </span>
            )}
            {askCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                {askCount} ask
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
