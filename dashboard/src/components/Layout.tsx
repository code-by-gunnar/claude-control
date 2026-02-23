import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { KeyboardShortcutsOverlay } from "./KeyboardShortcutsOverlay";
import { useRefresh } from "../lib/refresh-context";
import { useKeyboardNav } from "../hooks/useKeyboardNav";

export function Layout() {
  const { triggerRefresh, isRefreshing } = useRefresh();
  const [showShortcuts, setShowShortcuts] = useState(false);

  useKeyboardNav({ onToggleHelp: () => setShowShortcuts((prev) => !prev) });

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto pt-16 md:pt-8">
        <div className="flex items-center justify-end mb-4">
          <button
            type="button"
            onClick={triggerRefresh}
            disabled={isRefreshing}
            title="Refresh data"
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <svg
              className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
          </button>
        </div>
        <Outlet />
      </main>
      <KeyboardShortcutsOverlay
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
