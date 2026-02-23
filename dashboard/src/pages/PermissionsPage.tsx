import { useEffect, useState } from "react";
import { useRefresh } from "../lib/refresh-context";
import {
  fetchPermissions,
  removePermission,
  type PermissionsResult,
  type EffectivePermission,
} from "../lib/api";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";

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
  onRemoved,
}: {
  permission: EffectivePermission;
  onRemoved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const hasOverrides = permission.overrides.length > 1;

  async function handleRemove(override: {
    sourcePath: string;
    rule: string;
    raw: string;
  }) {
    setRemoving(true);
    setFeedback(null);
    try {
      await removePermission(
        override.sourcePath,
        override.rule as "allow" | "deny" | "ask",
        override.raw
      );
      setFeedback({ type: "success", msg: "Removed" });
      setConfirmIdx(null);
      setTimeout(() => onRemoved(), 600);
    } catch (err) {
      setFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to remove",
      });
    } finally {
      setRemoving(false);
    }
  }

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
              const canRemove = override.scope !== "managed";
              const isConfirming = confirmIdx === i;
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
                  {canRemove && (
                    isConfirming ? (
                      <span className="flex items-center gap-1 shrink-0">
                        <span className="text-xs text-red-600">Remove?</span>
                        <button
                          type="button"
                          disabled={removing}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(override);
                          }}
                          className="text-xs text-red-700 font-medium hover:text-red-900 disabled:opacity-50 px-1"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmIdx(null);
                          }}
                          className="text-xs text-slate-500 hover:text-slate-700 px-1"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmIdx(i);
                        }}
                        className="text-red-400 hover:text-red-600 shrink-0 p-0.5"
                        title="Remove permission"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )
                  )}
                </div>
              );
            })}
          </div>

          {/* Inline feedback */}
          {feedback && (
            <p
              className={`text-xs mt-2 ${
                feedback.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {feedback.msg}
            </p>
          )}

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
  const { refreshKey, setRefreshing, triggerRefresh } = useRefresh();

  async function loadData() {
    try {
      const result = await fetchPermissions();
      setData(result);
      setLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load permissions"
      );
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRefreshing(true);

    async function initialLoad() {
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
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    initialLoad();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

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
        <ErrorState
          title="Error loading permissions"
          message={error}
          onRetry={() => triggerRefresh()}
        />
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
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          }
          title="No permission rules configured"
          description="Permission rules control which tools Claude can run automatically, with prompting, or not at all."
          action={<>Add rules in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">settings.json</code> under the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">permissions</code> key with <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">allow</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">deny</code>, or <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">ask</code> arrays</>}
        />
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
                onRemoved={loadData}
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
