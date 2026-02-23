import { useEffect, useState } from "react";
import { useRefresh } from "../lib/refresh-context";
import { fetchAgents, type AgentsResult, type AgentInfo } from "../lib/api";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-slate-200 shrink-0"
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}

// --- Lightweight markdown renderer (same as MemoryPage) ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList: "ul" | "ol" | null = null;

  function closeList() {
    if (inList) {
      out.push(inList === "ul" ? "</ul>" : "</ol>");
      inList = null;
    }
  }

  function inlineFormat(text: string): string {
    let s = escapeHtml(text);
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        out.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
        codeLines = [];
        inCodeBlock = false;
      } else {
        closeList();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.trim() === "") {
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      out.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== "ul") {
        closeList();
        out.push("<ul>");
        inList = "ul";
      }
      out.push(`<li>${inlineFormat(ulMatch[2])}</li>`);
      continue;
    }

    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== "ol") {
        closeList();
        out.push("<ol>");
        inList = "ol";
      }
      out.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inCodeBlock) {
    out.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
  }
  closeList();

  return out.join("\n");
}

function AgentCard({
  agent,
  expanded,
  onToggle,
}: {
  agent: AgentInfo;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {agent.color && <ColorDot color={agent.color} />}
              <h3 className="text-sm font-semibold text-slate-900">
                {agent.name}
              </h3>
              {agent.model && (
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                  {agent.model}
                </span>
              )}
            </div>
            {agent.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {agent.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">
              {formatBytes(agent.sizeBytes)}
            </span>
            <span className="text-slate-400 text-xs">
              {expanded ? "\u25BC" : "\u25B6"}
            </span>
          </div>
        </div>

        {agent.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {agent.tools.map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono"
              >
                {tool}
              </span>
            ))}
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {/* Metadata */}
          <div className="p-4 bg-slate-50/50">
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-28 shrink-0">File:</dt>
                <dd className="font-mono text-xs text-slate-700">{agent.fileName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-slate-500 font-medium w-28 shrink-0">Path:</dt>
                <dd className="font-mono text-xs text-slate-400 break-all">{agent.path}</dd>
              </div>
              {agent.color && (
                <div className="flex gap-2 items-center">
                  <dt className="text-slate-500 font-medium w-28 shrink-0">Color:</dt>
                  <dd className="flex items-center gap-2 text-slate-700">
                    <ColorDot color={agent.color} />
                    <span className="font-mono text-xs">{agent.color}</span>
                  </dd>
                </div>
              )}
              {agent.model && (
                <div className="flex gap-2">
                  <dt className="text-slate-500 font-medium w-28 shrink-0">Model:</dt>
                  <dd className="text-slate-700">{agent.model}</dd>
                </div>
              )}
              {agent.tools.length > 0 && (
                <div className="flex gap-2">
                  <dt className="text-slate-500 font-medium w-28 shrink-0">Tools:</dt>
                  <dd className="text-slate-700">{agent.tools.join(", ")}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Content viewer */}
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Content
              </h4>
              <div className="flex rounded-md overflow-hidden border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setViewMode("rendered"); }}
                  className={`px-2.5 py-1 transition-colors ${
                    viewMode === "rendered"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Rendered
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setViewMode("raw"); }}
                  className={`px-2.5 py-1 transition-colors border-l border-slate-200 ${
                    viewMode === "raw"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Raw
                </button>
              </div>
            </div>

            {viewMode === "raw" ? (
              <pre className="text-xs font-mono bg-slate-100 rounded-md p-3 overflow-auto max-h-96 text-slate-700 whitespace-pre-wrap">
                {agent.content}
              </pre>
            ) : (
              <div
                className="markdown-content text-sm overflow-auto max-h-96"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(agent.content) }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AgentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AgentsResult | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const { refreshKey, setRefreshing, triggerRefresh } = useRefresh();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRefreshing(true);

    async function loadData() {
      try {
        const result = await fetchAgents();
        if (cancelled) return;
        setData(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load agents");
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
          Agents
        </h1>
        <ErrorState
          title="Error loading agents"
          message={error}
          onRetry={() => triggerRefresh()}
        />
      </div>
    );
  }

  const agents = data?.agents ?? [];

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
        Agents
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        Custom AI personas
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({data?.totalCount ?? 0} agent{(data?.totalCount ?? 0) !== 1 ? "s" : ""})
          </span>
        )}
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p>
          <strong>Agents</strong> are custom AI personas defined as Markdown files in{" "}
          <code className="font-mono text-xs bg-blue-100 px-1 rounded">~/.claude/agents/</code>.
          Each agent has YAML frontmatter specifying name, description, color, tools, and model.
          They are invoked as subagents via the Task tool.
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
      ) : agents.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          }
          title="No custom agents found"
          description="Agent files define specialized Claude behaviors with custom system prompts, tool sets, and model preferences."
          action={<>Create <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">.md</code> files in <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">~/.claude/agents/</code> with YAML frontmatter</>}
        />
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <AgentCard
              key={agent.fileName}
              agent={agent}
              expanded={expandedAgent === agent.fileName}
              onToggle={() =>
                setExpandedAgent(
                  expandedAgent === agent.fileName ? null : agent.fileName
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
