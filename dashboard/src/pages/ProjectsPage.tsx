import { useEffect, useState } from "react";
import { useRefresh } from "../lib/refresh-context";
import {
  fetchProjects,
  fetchCompare,
  type WorkspaceScan,
  type ProjectInfo,
  type ComparisonResult,
  type ComparisonEntry,
} from "../lib/api";
import { EmptyState } from "../components/EmptyState";
import { Breadcrumbs, type BreadcrumbItem } from "../components/Breadcrumbs";

/** Group comparison entries by their type field */
function groupEntries(entries: ComparisonEntry[]): Record<string, ComparisonEntry[]> {
  const groups: Record<string, ComparisonEntry[]> = {};
  for (const entry of entries) {
    const label = entry.type;
    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }
  return groups;
}

/** Render a value cell in the comparison table */
function ValueCell({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return <span className="text-slate-300 italic">--</span>;
  }
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return (
    <span className="text-slate-700 font-mono text-xs truncate block" title={str}>
      {str.length > 30 ? str.slice(0, 30) + "..." : str}
    </span>
  );
}

/** Check if values differ across projects for a comparison entry */
function hasDifference(entry: ComparisonEntry, projects: string[]): boolean {
  const vals = projects.map((p) => JSON.stringify(entry.values[p] ?? null));
  return new Set(vals).size > 1;
}

function ConfigIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
      {label}
    </span>
  );
}

function ProjectCard({
  project,
  selected,
  onToggle,
}: {
  project: ProjectInfo;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-left bg-white rounded-lg shadow-sm border-2 p-4 transition-all hover:shadow-md ${
        selected
          ? "border-blue-500 ring-2 ring-blue-100"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 truncate" title={project.path}>
          {project.name}
        </h3>
        {selected && (
          <svg className="w-5 h-5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <ConfigIndicator active={project.hasClaudeMd} label="CLAUDE.md" />
        <ConfigIndicator active={project.hasClaudeDir} label=".claude/" />
        <ConfigIndicator active={project.hasMcpJson} label=".mcp.json" />
      </div>
      <p className="text-xs text-slate-400 mt-2 truncate" title={project.path}>
        {project.path}
      </p>
    </button>
  );
}

function ComparisonTable({
  comparison,
}: {
  comparison: ComparisonResult;
}) {
  const grouped = groupEntries(comparison.entries);
  const typeLabels: Record<string, string> = {
    setting: "Settings",
    mcp: "MCP Servers",
    hook: "Hooks",
    permission: "Permissions",
    memory: "Memory",
  };

  return (
    <div>
      <div className="mb-4">
        <span className="text-sm text-slate-500">
          Comparing {comparison.projects.length} projects &middot;{" "}
          {comparison.summary.totalDifferences} difference{comparison.summary.totalDifferences !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        {Object.entries(grouped).map(([type, entries]) => (
          <div key={type} className="mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">
              {typeLabels[type] ?? type}
            </h3>
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-200 sticky left-0 bg-slate-50 z-10 min-w-48">
                    Key
                  </th>
                  {comparison.projects.map((name) => (
                    <th
                      key={name}
                      className="text-left px-3 py-2 text-xs font-medium text-slate-500 border-b border-slate-200 min-w-36"
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const differs = hasDifference(entry, comparison.projects);
                  return (
                    <tr
                      key={entry.key}
                      className={differs ? "bg-yellow-50" : "bg-white"}
                    >
                      <td className="px-3 py-2 border-b border-slate-100 font-mono text-xs text-slate-800 sticky left-0 bg-inherit z-10">
                        {entry.key}
                        {differs && (
                          <span className="ml-1 text-yellow-600 text-[10px] font-sans font-medium">
                            differs
                          </span>
                        )}
                      </td>
                      {comparison.projects.map((name) => (
                        <td key={name} className="px-3 py-2 border-b border-slate-100">
                          <ValueCell value={entry.values[name]} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {comparison.entries.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400">
            No configuration entries found to compare
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectsPage() {
  const [parentDir, setParentDir] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceScan | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const { refreshKey, setRefreshing } = useRefresh();

  // Prefill with parent of project dir from scan data
  useEffect(() => {
    setRefreshing(true);
    setWorkspace(null);
    setComparison(null);
    setError(null);

    async function getProjectDir() {
      try {
        const res = await fetch("/api/scan");
        if (res.ok) {
          const data = await res.json();
          if (data.projectDir) {
            // Go up one level to get parent
            const parts = (data.projectDir as string).replace(/\\/g, "/").split("/");
            parts.pop();
            setParentDir(parts.join("/") || "/");
          }
        }
      } catch {
        // ignore
      } finally {
        setRefreshing(false);
      }
    }
    getProjectDir();
  }, [refreshKey]);

  async function handleDiscover() {
    if (!parentDir.trim()) return;
    setDiscovering(true);
    setError(null);
    setWorkspace(null);
    setSelectedPaths(new Set());
    setComparison(null);

    try {
      const result = await fetchProjects(parentDir.trim());
      setWorkspace(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleCompare() {
    if (selectedPaths.size < 2) return;
    setComparing(true);
    setError(null);

    try {
      const result = await fetchCompare(Array.from(selectedPaths));
      setComparison(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setComparing(false);
    }
  }

  function toggleProject(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  // Derive current step from state
  type ProjectStep = "discover" | "select" | "compare";
  const step: ProjectStep = comparison ? "compare" : workspace ? "select" : "discover";

  // Build breadcrumb items based on current step
  const resetToDiscover = () => {
    setWorkspace(null);
    setSelectedPaths(new Set());
    setComparison(null);
  };
  const resetToSelect = () => setComparison(null);

  const breadcrumbItems: BreadcrumbItem[] =
    step === "discover"
      ? [{ label: "Discover" }]
      : step === "select"
        ? [{ label: "Discover", onClick: resetToDiscover }, { label: "Select" }]
        : [
            { label: "Discover", onClick: resetToDiscover },
            { label: "Select", onClick: resetToSelect },
            { label: "Compare" },
          ];

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Projects</h1>
      <p className="text-sm text-slate-500 mb-4">
        {comparison
          ? "Cross-project configuration comparison"
          : "Discover and compare Claude Code configurations across projects"}
      </p>
      <div className="mb-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* Comparison view */}
      {comparison && <ComparisonTable comparison={comparison} />}

      {/* Discovery + selection view */}
      {!comparison && (
        <>

      {/* Explainer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p className="mb-2">
          <strong>Project discovery</strong> scans a parent directory to find
          all projects with Claude Code configuration. You can then select
          multiple projects to compare their setups side-by-side.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Projects are detected by the presence of{" "}
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">CLAUDE.md</code>,{" "}
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">.claude/</code>, or{" "}
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">.mcp.json</code>
          </li>
          <li>
            Select 2+ projects and click <strong>Compare</strong> to see
            differences in settings, MCP servers, hooks, and permissions
          </li>
          <li>
            Rows highlighted in yellow have values that differ across the
            selected projects
          </li>
        </ul>
      </div>

      {/* Directory input */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={parentDir}
          onChange={(e) => setParentDir(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
          placeholder="Enter parent directory path..."
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
        />
        <button
          type="button"
          onClick={handleDiscover}
          disabled={discovering || !parentDir.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {discovering ? "Discovering..." : "Discover"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 mb-6">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading */}
      {discovering && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-32 mb-3" />
              <div className="flex gap-2">
                <div className="h-5 bg-slate-100 rounded w-20" />
                <div className="h-5 bg-slate-100 rounded w-16" />
              </div>
              <div className="h-3 bg-slate-100 rounded w-48 mt-3" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {workspace && !discovering && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600">
              Found {workspace.totalProjects} project{workspace.totalProjects !== 1 ? "s" : ""} in{" "}
              <span className="font-mono text-xs">{workspace.parentDir}</span>
              {workspace.configuredProjects > 0 && (
                <span className="text-slate-400">
                  {" "}
                  ({workspace.configuredProjects} with Claude Code config)
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={handleCompare}
              disabled={selectedPaths.size < 2 || comparing}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {comparing
                ? "Comparing..."
                : `Compare Selected (${selectedPaths.size})`}
            </button>
          </div>

          {workspace.projects.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                </svg>
              }
              title="No Claude Code projects found"
              description="Project discovery scans the parent directory for folders that contain Claude Code configuration."
              action={<>Make sure sibling directories have <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">.claude/</code> folders or <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-500">CLAUDE.md</code> files</>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspace.projects.map((project) => (
                <ProjectCard
                  key={project.path}
                  project={project}
                  selected={selectedPaths.has(project.path)}
                  onToggle={() => toggleProject(project.path)}
                />
              ))}
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}
