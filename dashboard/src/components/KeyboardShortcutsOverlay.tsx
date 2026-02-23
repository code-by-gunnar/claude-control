import { useEffect } from "react";
import { SHORTCUTS } from "../hooks/useKeyboardNav";

interface KeyboardShortcutsOverlayProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  label: string;
  items: { key: string; label: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    label: "Overview",
    items: SHORTCUTS.filter((s) => s.route === "/").map((s) => ({ key: s.key, label: s.label })),
  },
  {
    label: "Configuration",
    items: SHORTCUTS.filter((s) =>
      ["/settings", "/memory", "/permissions"].includes(s.route)
    ).map((s) => ({ key: s.key, label: s.label })),
  },
  {
    label: "Extensions",
    items: SHORTCUTS.filter((s) =>
      ["/mcp", "/plugins", "/marketplaces", "/hooks", "/agents", "/skills"].includes(s.route)
    ).map((s) => ({ key: s.key, label: s.label })),
  },
  {
    label: "Workspace",
    items: SHORTCUTS.filter((s) =>
      ["/health", "/projects"].includes(s.route)
    ).map((s) => ({ key: s.key, label: s.label })),
  },
];

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-slate-700 text-slate-200 font-mono text-xs px-2 py-1 rounded">
      {children}
    </span>
  );
}

export function KeyboardShortcutsOverlay({ open, onClose }: KeyboardShortcutsOverlayProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 text-slate-200 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            aria-label="Close shortcuts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shortcut groups */}
        <div className="px-6 py-4 space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <span className="flex items-center gap-1">
                      <KeyBadge>G</KeyBadge>
                      <span className="text-slate-500 text-xs">then</span>
                      <KeyBadge>{item.key.toUpperCase()}</KeyBadge>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — help shortcut */}
        <div className="px-6 py-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Toggle this help</span>
            <KeyBadge>?</KeyBadge>
          </div>
        </div>
      </div>
    </div>
  );
}
