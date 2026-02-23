import { useEffect, useState } from "react";
import {
  fetchMemory,
  fetchMemoryImports,
  fetchScan,
  type ConfigFile,
  type MemoryFile,
  type MemoryImportResult,
  type ResolvedMemoryFile,
  type ScanResult,
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

/** Split a path into dimmed prefix and highlighted suffix */
function splitPath(fullPath: string): { prefix: string; suffix: string } {
  const shortened = shortenPath(fullPath);
  // Find the last separator (/ or \)
  const lastSep = Math.max(shortened.lastIndexOf("/"), shortened.lastIndexOf("\\"));
  if (lastSep === -1) return { prefix: "", suffix: shortened };
  return {
    prefix: shortened.slice(0, lastSep + 1),
    suffix: shortened.slice(lastSep + 1),
  };
}

/** Format file size in human-readable form */
function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Lightweight markdown renderer ---

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
    // Links: [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    // Bold: **text** or __text__
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__(.+?)__/g, "<strong>$1</strong>");
    // Inline code: `text`
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    return s;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
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

    // Empty line
    if (line.trim() === "") {
      closeList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1].length;
      out.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list items
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

    // Ordered list items
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

    // Regular paragraph
    closeList();
    out.push(`<p>${inlineFormat(line)}</p>`);
  }

  // Close any remaining open blocks
  if (inCodeBlock) {
    out.push("<pre><code>" + escapeHtml(codeLines.join("\n")) + "</code></pre>");
  }
  closeList();

  return out.join("\n");
}

// --- Expected CLAUDE.md locations ---

interface MemorySlot {
  label: string;
  scope: string;
  description: string;
  guidance: string;
  matchPath: (path: string) => boolean;
}

const MEMORY_SLOTS: MemorySlot[] = [
  {
    label: "User CLAUDE.md",
    scope: "user",
    description:
      "Your personal defaults — applies to every project. Use this for coding style preferences, favorite tools and frameworks, response format preferences, and patterns you always want Claude to follow regardless of the project.",
    guidance:
      'Create ~/.claude/CLAUDE.md to set your personal baseline. Example: "Always use TypeScript strict mode, prefer functional patterns, use pnpm, write concise commit messages."',
    matchPath: (p) => {
      const norm = p.replace(/\\/g, "/");
      return /\/\.claude\/CLAUDE\.md$/.test(norm);
    },
  },
  {
    label: "Project Root CLAUDE.md",
    scope: "project",
    description:
      "The main project instructions file, checked into the repo root. Best for build/test commands, architecture overview, coding conventions, key file paths, and anything the whole team should share. This is the most commonly used location.",
    guidance:
      "Create CLAUDE.md at your project root (next to package.json). This is the recommended starting point — it's visible, version-controlled, and shared with your team.",
    matchPath: (p) => {
      const norm = p.replace(/\\/g, "/");
      // Match project root CLAUDE.md (not inside .claude/)
      return /\/CLAUDE\.md$/.test(norm) && !norm.includes("/.claude/");
    },
  },
  {
    label: "Project .claude/CLAUDE.md",
    scope: "project",
    description:
      "Alternative project instructions inside the .claude/ config directory. Useful for keeping the repo root clean or for supplementary instructions that live alongside other Claude config files (settings, MCP, permissions).",
    guidance:
      "Create .claude/CLAUDE.md if you prefer to keep Claude config grouped together, or use it alongside the root file for additional context that doesn't belong in the main CLAUDE.md.",
    matchPath: (p) => {
      const norm = p.replace(/\\/g, "/");
      // Match .claude/CLAUDE.md inside project (not user home)
      return /\/\.claude\/CLAUDE\.md$/.test(norm);
    },
  },
];

/**
 * Match scan files (CLAUDE.md type) to their expected slots.
 * Returns slot info merged with found file data (or null if missing).
 */
function matchSlotsToFiles(
  scanFiles: ConfigFile[],
  memoryFiles: MemoryFile[]
): Array<{
  slot: MemorySlot;
  scanFile: ConfigFile | null;
  memoryFile: MemoryFile | null;
}> {
  const claudeMdFiles = scanFiles.filter((f) => f.type === "claude-md");

  return MEMORY_SLOTS.map((slot) => {
    // Try to find a matching scan file (scope + path pattern)
    const scanFile = claudeMdFiles.find((f) => f.scope === slot.scope && slot.matchPath(f.expectedPath)) ?? null;
    // If found, also match the memory file for content
    const memoryFile = scanFile
      ? memoryFiles.find((m) => m.path === scanFile.expectedPath) ?? null
      : null;
    return { slot, scanFile, memoryFile };
  });
}

// --- Components ---

function ImportSection({ importData }: { importData: ResolvedMemoryFile }) {
  const totalImports = importData.imports.length;
  const brokenCount = importData.imports.filter((i) => !i.exists).length;

  return (
    <div className="border-t border-slate-100 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-medium text-slate-500">Imports</p>
        <span className="text-xs text-slate-400">
          ({totalImports} file{totalImports !== 1 ? "s" : ""}
          {brokenCount > 0 && (
            <span className="text-red-500">, {brokenCount} broken</span>
          )}
          )
        </span>
        {importData.hasCircular && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
            circular
          </span>
        )}
      </div>
      <ul className="space-y-1">
        {importData.imports.map((imp, idx) => (
          <li key={idx} className="flex items-center gap-2 text-xs">
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                imp.exists ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
            <span
              className="font-mono text-slate-600 truncate"
              title={imp.resolvedPath}
            >
              {shortenPath(imp.resolvedPath)}
            </span>
            {!imp.exists && (
              <span className="text-red-400 shrink-0">missing</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemoryLocationCard({
  slot,
  scanFile,
  memoryFile,
  importData,
}: {
  slot: MemorySlot;
  scanFile: ConfigFile | null;
  memoryFile: MemoryFile | null;
  importData?: ResolvedMemoryFile;
}) {
  const found = scanFile?.exists === true;
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"rendered" | "source">("rendered");
  const hasImports = importData && importData.imports.length > 0;
  const content =
    memoryFile?.content ??
    (typeof scanFile?.content === "string" ? scanFile.content : null);
  const path = scanFile?.expectedPath ?? "";
  const { prefix, suffix } = splitPath(path);

  if (!found) {
    return (
      <div className="bg-white rounded-lg border-2 border-dashed border-slate-200 overflow-hidden">
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-medium text-slate-400">
                  {slot.label}
                </p>
                <ScopeBadge scope={slot.scope} />
              </div>
              {path && (
                <p
                  className="text-xs font-mono text-slate-300 truncate mb-2"
                  title={path}
                >
                  <span>{shortenPath(path)}</span>
                </p>
              )}
              <p className="text-xs text-slate-400">{slot.description}</p>
              <p className="text-xs text-slate-400 mt-1 italic">
                {slot.guidance}
              </p>
            </div>
            <div className="ml-3 shrink-0">
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
                not found
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 border-l-4 border-l-emerald-400 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-slate-800">{slot.label}</p>
              <ScopeBadge scope={slot.scope} />
            </div>
            <p
              className="text-xs font-mono truncate"
              title={path}
            >
              <span className="text-slate-400">{prefix}</span>
              <span className="text-slate-700">{suffix}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {formatSize(memoryFile?.sizeBytes ?? scanFile?.sizeBytes)}
              {hasImports && (
                <span className="ml-2">
                  {importData.imports.length} import
                  {importData.imports.length !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-3 shrink-0">
            <span className="text-slate-400 text-xs">
              {expanded ? "\u25BC" : "\u25B6"}
            </span>
          </div>
        </div>
      </button>

      {/* Import section (always visible if imports exist) */}
      {hasImports && <ImportSection importData={importData} />}

      {expanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("rendered");
                }}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  viewMode === "rendered"
                    ? "bg-slate-200 text-slate-700 font-medium"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Rendered
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode("source");
                }}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  viewMode === "source"
                    ? "bg-slate-200 text-slate-700 font-medium"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Source
              </button>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Collapse
            </button>
          </div>
          {content ? (
            viewMode === "source" ? (
              <pre className="text-xs font-mono bg-slate-100 rounded-md p-3 overflow-auto max-h-96 text-slate-700 whitespace-pre-wrap">
                {content}
              </pre>
            ) : (
              <div
                className="markdown-content text-sm overflow-auto max-h-96"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
              />
            )
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
  const [importResult, setImportResult] = useState<MemoryImportResult | null>(
    null
  );
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [memoryResult, imports, scan] = await Promise.all([
          fetchMemory(),
          fetchMemoryImports().catch(() => null),
          fetchScan().catch(() => null),
        ]);
        if (cancelled) return;
        setFiles(memoryResult ?? []);
        setImportResult(imports);
        setScanResult(scan);
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

  // Match slots to files
  const slots = scanResult
    ? matchSlotsToFiles(scanResult.files, files)
    : null;
  const activeCount = slots
    ? slots.filter((s) => s.scanFile?.exists).length
    : files.length;

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">
          Memory
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading memory files</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">
        Memory
      </h1>
      <p className="text-sm text-slate-500 mb-4">
        CLAUDE.md files and @import chains
        {!loading && (
          <span className="ml-1 text-slate-400">
            ({activeCount} of 3 locations active
            {importResult && importResult.totalImports > 0 && (
              <span>
                , {importResult.totalImports} import
                {importResult.totalImports !== 1 ? "s" : ""}
                {importResult.totalBroken > 0 && (
                  <span className="text-red-400">
                    , {importResult.totalBroken} broken
                  </span>
                )}
              </span>
            )}
            )
          </span>
        )}
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
        <p className="mb-2">
          <strong>CLAUDE.md</strong> files provide persistent instructions to
          Claude Code. They layer together — all found files are combined, with
          project-level instructions taking precedence over user-level ones.
        </p>
        <ul className="list-disc pl-5 space-y-1 mb-2">
          <li>
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">~/.claude/CLAUDE.md</code>
            {" "}&mdash; your <strong>personal defaults</strong> across all projects (coding style, preferred tools)
          </li>
          <li>
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">CLAUDE.md</code>
            {" "}&mdash; the <strong>main project file</strong> at the repo root, shared with your team (build commands, architecture, conventions)
          </li>
          <li>
            <code className="font-mono text-xs bg-blue-100 px-1 rounded">.claude/CLAUDE.md</code>
            {" "}&mdash; <strong>supplementary project instructions</strong> grouped with other Claude config files
          </li>
        </ul>
        <p className="text-blue-700 text-xs">
          Using multiple files keeps concerns separated — personal preferences don&rsquo;t clutter the team&rsquo;s project file, and vice versa.
          Use{" "}
          <code className="font-mono text-xs bg-blue-100 px-1 rounded">@import</code>
          {" "}to pull in shared instruction files.
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
                  <div className="h-4 bg-slate-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-32 mb-1" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
                <div className="h-5 bg-slate-200 rounded w-14" />
              </div>
            </div>
          ))}
        </div>
      ) : slots ? (
        <div className="space-y-6">
          {/* Global section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Global
              </h2>
              <span className="text-xs text-slate-400">
                Applies to all projects
              </span>
            </div>
            {slots
              .filter(({ slot }) => slot.scope === "user")
              .map(({ slot, scanFile, memoryFile }) => {
                const fileImports = memoryFile
                  ? importResult?.files.find((f) => f.path === memoryFile.path)
                  : undefined;
                return (
                  <MemoryLocationCard
                    key={slot.label}
                    slot={slot}
                    scanFile={scanFile}
                    memoryFile={memoryFile}
                    importData={fileImports}
                  />
                );
              })}
          </section>

          {/* Project section */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Project
              </h2>
              <span className="text-xs text-slate-400">
                Specific to this project
              </span>
              {scanResult && (
                <span className="text-xs font-mono text-slate-400 truncate" title={scanResult.projectDir}>
                  &mdash; {scanResult.projectDir}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {slots
                .filter(({ slot }) => slot.scope === "project")
                .map(({ slot, scanFile, memoryFile }) => {
                  const fileImports = memoryFile
                    ? importResult?.files.find(
                        (f) => f.path === memoryFile.path
                      )
                    : undefined;
                  return (
                    <MemoryLocationCard
                      key={slot.label}
                      slot={slot}
                      scanFile={scanFile}
                      memoryFile={memoryFile}
                      importData={fileImports}
                    />
                  );
                })}
            </div>
          </section>
        </div>
      ) : (
        /* Fallback: no scan result, show memory files directly */
        <div className="space-y-6">
          {files.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center text-slate-400">
              No CLAUDE.md files found
            </div>
          ) : (
            <>
              {/* Global section */}
              {files.some((f) => f.scope === "user") && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      Global
                    </h2>
                    <span className="text-xs text-slate-400">
                      Applies to all projects
                    </span>
                  </div>
                  <div className="space-y-3">
                    {files
                      .filter((f) => f.scope === "user")
                      .map((file) => {
                        const fileImports = importResult?.files.find(
                          (f) => f.path === file.path
                        );
                        const matchedSlot = MEMORY_SLOTS.find((s) =>
                          s.matchPath(file.path)
                        );
                        const slot = matchedSlot ?? {
                          label: shortenPath(file.path),
                          scope: file.scope,
                          description: "",
                          guidance: "",
                          matchPath: () => false,
                        };
                        return (
                          <MemoryLocationCard
                            key={file.path}
                            slot={slot}
                            scanFile={{
                              scope: file.scope,
                              type: "claude-md",
                              expectedPath: file.path,
                              exists: true,
                              sizeBytes: file.sizeBytes,
                              content: file.content,
                            }}
                            memoryFile={file}
                            importData={fileImports}
                          />
                        );
                      })}
                  </div>
                </section>
              )}

              {/* Project section */}
              {files.some((f) => f.scope !== "user") && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                      Project
                    </h2>
                    <span className="text-xs text-slate-400">
                      Specific to this project
                    </span>
                  </div>
                  <div className="space-y-3">
                    {files
                      .filter((f) => f.scope !== "user")
                      .map((file) => {
                        const fileImports = importResult?.files.find(
                          (f) => f.path === file.path
                        );
                        const matchedSlot = MEMORY_SLOTS.find((s) =>
                          s.matchPath(file.path)
                        );
                        const slot = matchedSlot ?? {
                          label: shortenPath(file.path),
                          scope: file.scope,
                          description: "",
                          guidance: "",
                          matchPath: () => false,
                        };
                        return (
                          <MemoryLocationCard
                            key={file.path}
                            slot={slot}
                            scanFile={{
                              scope: file.scope,
                              type: "claude-md",
                              expectedPath: file.path,
                              exists: true,
                              sizeBytes: file.sizeBytes,
                              content: file.content,
                            }}
                            memoryFile={file}
                            importData={fileImports}
                          />
                        );
                      })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
