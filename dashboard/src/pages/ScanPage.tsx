import { useEffect, useState } from "react";
import { useRefresh } from "../lib/refresh-context";
import {
  fetchSkillsScan,
  type SkillScanResult,
  type SkillScanEntry,
  type SkillFinding,
  type FindingSeverity,
} from "../lib/api";
import { InfoBubble } from "../components/InfoBubble";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";

/** Badge color classes per severity. */
const severityColors: Record<FindingSeverity, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-red-50 text-red-700",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-700",
};

/** Status badge color classes. */
const statusColors: Record<SkillScanEntry["status"], string> = {
  clean: "bg-emerald-100 text-emerald-700",
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
};

/** Status icon per status. */
function StatusIcon({ status }: { status: SkillScanEntry["status"] }) {
  if (status === "clean") {
    return (
      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (status === "danger") {
    return (
      <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (status === "warning") {
    return (
      <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Shorten a file path by replacing home directory with ~. */
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

function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${severityColors[severity]}`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: SkillScanEntry["status"] }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
    >
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  if (!source) return null;
  const colors: Record<string, string> = {
    command: "bg-amber-100 text-amber-700",
    skill: "bg-teal-100 text-teal-700",
    plugin: "bg-indigo-100 text-indigo-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[source] ?? "bg-slate-100 text-slate-600"}`}
    >
      {source}
    </span>
  );
}

function FindingsTable({ findings }: { findings: SkillFinding[] }) {
  return (
    <div className="border border-slate-200 rounded-md overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Severity</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Finding</th>
            <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 uppercase">Line</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {findings.map((finding, i) => (
            <tr key={`${finding.ruleId}-${i}`} className="hover:bg-slate-50/50">
              <td className="px-3 py-2 whitespace-nowrap">
                <SeverityBadge severity={finding.severity} />
              </td>
              <td className="px-3 py-2">
                <div className="text-slate-800">{finding.message}</div>
                {finding.snippet && (
                  <pre className="mt-1 text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded overflow-auto max-w-lg">
                    {finding.snippet.trim()}
                  </pre>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-slate-400 font-mono text-xs">
                {finding.line ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScanEntryRow({ entry }: { entry: SkillScanEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
      >
        <span className="text-slate-400 text-xs w-4 shrink-0">
          {entry.findings.length > 0 ? (expanded ? "\u25BC" : "\u25B6") : ""}
        </span>
        <StatusIcon status={entry.status} />
        <span className="font-mono text-sm text-slate-900 font-medium">
          {entry.name}
        </span>
        <SourceBadge source={entry.source} />
        <span className="flex-1" />
        {entry.findings.length > 0 && (
          <span className="text-xs text-slate-400">
            {entry.findings.length} finding{entry.findings.length !== 1 ? "s" : ""}
          </span>
        )}
        <StatusBadge status={entry.status} />
      </button>

      {expanded && entry.findings.length > 0 && (
        <div className="px-4 pb-4 pl-12 bg-slate-50/50 border-t border-slate-100">
          <div className="text-xs text-slate-400 font-mono mb-3 break-all mt-3">
            {shortenPath(entry.path)}
          </div>
          <FindingsTable findings={entry.findings} />
        </div>
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: SkillScanResult["summary"] }) {
  const cards = [
    { label: "Total Scanned", value: summary.total, color: "text-slate-900", bg: "bg-white" },
    { label: "Clean", value: summary.clean, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Warning", value: summary.warning, color: "text-yellow-700", bg: "bg-yellow-50" },
    { label: "Danger", value: summary.danger, color: "text-red-700", bg: "bg-red-50" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} rounded-lg shadow-sm border border-slate-200 p-4`}
        >
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {card.label}
          </p>
          <p className={`text-2xl font-bold mt-1 ${card.color}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ScanPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<SkillScanResult | null>(null);
  const [filter, setFilter] = useState("");
  const { refreshKey, setRefreshing, triggerRefresh } = useRefresh();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRefreshing(true);

    async function loadData() {
      try {
        const result = await fetchSkillsScan();
        if (cancelled) return;
        setScanResult(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load scan data");
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">Skill Scan</h1>
        <ErrorState
          title="Error loading scan data"
          message={error}
          onRetry={() => triggerRefresh()}
        />
      </div>
    );
  }

  const filteredEntries =
    scanResult?.entries.filter((e) =>
      e.name.toLowerCase().includes(filter.toLowerCase())
    ) ?? [];

  // Sort: danger first, then warning, info, clean
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const order = { danger: 3, warning: 2, info: 1, clean: 0 };
    return order[b.status] - order[a.status];
  });

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Skill Scan</h1>
      <p className="text-sm text-slate-500 mb-6">
        Security scan of skills, commands, and plugin capabilities{" "}
        <InfoBubble text="Scans skill content for patterns that may indicate prompt injection, data exfiltration, or system compromise. This is a heuristic scan — some findings may be false positives. Review each finding in context." />
      </p>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-20 mb-2" />
                <div className="h-7 bg-slate-100 rounded w-12" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-slate-100 animate-pulse flex gap-4">
                <div className="h-4 bg-slate-200 rounded w-4" />
                <div className="h-4 bg-slate-200 rounded w-40" />
                <div className="flex-1" />
                <div className="h-4 bg-slate-200 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : scanResult && scanResult.entries.length > 0 ? (
        <div className="space-y-6">
          <SummaryCards summary={scanResult.summary} />

          {/* Explainer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
            <p>
              Skills are <code className="font-mono text-xs bg-blue-100 px-1 rounded">.md</code> files
              injected directly into Claude's prompt context.
              This scan checks for patterns that may indicate{" "}
              <strong>prompt injection</strong>, <strong>data exfiltration</strong>,{" "}
              <strong>system compromise</strong>, or <strong>obfuscation</strong>.
              Review findings in context — some patterns may have legitimate uses.
            </p>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Filter by skill name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full max-w-xs"
            />
            {filter && (
              <span className="text-xs text-slate-400">
                {sortedEntries.length} of {scanResult.entries.length} shown
              </span>
            )}
          </div>

          {/* Entries list */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="px-4 py-2 flex gap-3 text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 rounded-t-lg">
              <span className="w-4" />
              <span className="w-4" />
              <span className="flex-1">Skill</span>
              <span className="shrink-0">Status</span>
            </div>
            {sortedEntries.length > 0 ? (
              sortedEntries.map((entry) => (
                <ScanEntryRow key={`${entry.name}-${entry.path}`} entry={entry} />
              ))
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                No skills match the filter.
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          }
          title="No skills to scan"
          description="Install skills or plugins to scan them for security issues."
          action={<>Skills live in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">~/.claude/skills/</code> and <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">~/.claude/commands/</code></>}
        />
      )}
    </div>
  );
}
