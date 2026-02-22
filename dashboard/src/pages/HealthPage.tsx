import { useEffect, useState } from "react";
import { fetchHealth, type HealthResult, type HealthCategory } from "../lib/api";

/** Map grade letter to Tailwind color classes */
function gradeColors(grade: string): { text: string; bg: string; ring: string } {
  switch (grade) {
    case "A":
      return { text: "text-emerald-600", bg: "bg-emerald-500", ring: "ring-emerald-200" };
    case "B":
      return { text: "text-green-600", bg: "bg-green-500", ring: "ring-green-200" };
    case "C":
      return { text: "text-yellow-600", bg: "bg-yellow-500", ring: "ring-yellow-200" };
    case "D":
      return { text: "text-orange-600", bg: "bg-orange-500", ring: "ring-orange-200" };
    default:
      return { text: "text-red-600", bg: "bg-red-500", ring: "ring-red-200" };
  }
}

function scoreBarColor(score: number): string {
  if (score >= 90) return "bg-emerald-500";
  if (score >= 75) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const colors = gradeColors(grade);
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-32 h-32 rounded-full flex items-center justify-center ring-8 ${colors.ring} bg-white shadow-sm`}
      >
        <div className="text-center">
          <span className={`text-4xl font-bold ${colors.text}`}>{Math.round(score)}</span>
          <span className="text-sm text-slate-400 block -mt-1">/ 100</span>
        </div>
      </div>
      <span className={`mt-3 text-2xl font-bold ${colors.text}`}>Grade: {grade}</span>
    </div>
  );
}

function CategoryCard({ category }: { category: HealthCategory }) {
  const barColor = scoreBarColor(category.score);
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{category.name}</h3>
        <span className="text-sm font-mono text-slate-500">
          {Math.round(category.score)}/100
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(category.score, 2)}%` }}
        />
      </div>

      {/* Checks */}
      <ul className="space-y-2">
        {category.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 text-sm">
            {check.passed ? (
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className={check.passed ? "text-slate-600" : "text-slate-800 font-medium"}>
              {check.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HealthPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const result = await fetchHealth();
        if (cancelled) return;
        setHealth(result);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load health data");
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-6">Health</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Error loading health data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-1">Health</h1>
      <p className="text-sm text-slate-500 mb-6">Configuration health score and recommendations</p>

      {/* Explainer */}
      {!loading && health && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 text-sm text-blue-800">
          <p className="mb-2">
            <strong>Health score</strong> evaluates your Claude Code setup
            against recommended best practices. Each category checks for
            specific configuration patterns:
          </p>
          <ul className="list-disc pl-5 space-y-1 mb-2">
            <li>
              <strong>CLAUDE.md</strong> &mdash; do you have project instructions to guide Claude?
            </li>
            <li>
              <strong>MCP servers</strong> &mdash; are tools configured for Claude to use?
            </li>
            <li>
              <strong>Permissions</strong> &mdash; are tool permissions explicitly defined?
            </li>
            <li>
              <strong>Settings</strong> &mdash; are key behaviors configured?
            </li>
            <li>
              <strong>Hooks</strong> &mdash; are lifecycle hooks set up for automation?
            </li>
          </ul>
          <p className="text-blue-700 text-xs">
            A perfect score isn&rsquo;t required &mdash; the checks highlight
            areas where adding configuration could improve your Claude Code
            experience. Focus on the recommendations below.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {/* Score skeleton */}
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full bg-slate-200 animate-pulse" />
          </div>
          {/* Category skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 animate-pulse"
              >
                <div className="h-4 bg-slate-200 rounded w-24 mb-3" />
                <div className="h-2 bg-slate-100 rounded-full w-full mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-36" />
                  <div className="h-3 bg-slate-100 rounded w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : health ? (
        <div className="space-y-8">
          {/* Score gauge and summary */}
          <div className="flex flex-col items-center text-center">
            <ScoreGauge score={health.overallScore} grade={health.grade} />
            <p className="mt-4 text-sm text-slate-600 max-w-md">{health.summary}</p>
          </div>

          {/* Category breakdown */}
          <div>
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Category Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {health.categories.map((cat) => (
                <CategoryCard key={cat.name} category={cat} />
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {health.recommendations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Recommendations</h2>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 divide-y divide-slate-100">
                {health.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-700">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
