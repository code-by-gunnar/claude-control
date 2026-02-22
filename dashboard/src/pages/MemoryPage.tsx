import { useEffect, useState } from "react";
import { fetchMemory, type MemoryFile } from "../lib/api";

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

/** Shorten a path by replacing home dir prefix with ~ */
function shortenPath(fullPath: string): string {
  const home = fullPath.replace(
    /^(\/[^/]+\/[^/]+|[A-Z]:\\Users\\[^\\]+).*$/,
    "$1"
  );
  if (home && fullPath.startsWith(home)) {
    return "~" + fullPath.slice(home.length);
  }
  return fullPath;
}

/** Format file size in human-readable form */
function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MemoryCard({ file }: { file: MemoryFile }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-mono text-slate-800 truncate"
              title={file.path}
            >
              {shortenPath(file.path)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {formatSize(file.sizeBytes)}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <ScopeBadge scope={file.scope} />
            <span className="text-slate-400 text-xs">
              {expanded ? "\u25BC" : "\u25B6"}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">Content</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Collapse
            </button>
          </div>
          {file.content ? (
            <pre className="text-xs font-mono bg-slate-100 rounded-md p-3 overflow-auto max-h-96 text-slate-700 whitespace-pre-wrap">
              {typeof file.content === "string"
                ? file.content
                : JSON.stringify(file.content, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-slate-400 italic">
              No content available
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function MemoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<MemoryFile[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const result = await fetchMemory();
        if (cancelled) return;
        setFiles(result ?? []);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load memory files"
        );
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
        <h1 className="text-2xl font-semibold text-slate-900 mb-6">Memory</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading memory files</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Memory</h1>
      <p className="text-sm text-slate-500 mb-6">
        CLAUDE.md files
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({files.length} file{files.length !== 1 ? "s" : ""})
          </span>
        )}
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse"
            >
              <div className="flex justify-between">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
                <div className="h-5 bg-slate-200 rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
          No CLAUDE.md files found
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <MemoryCard key={file.path} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
