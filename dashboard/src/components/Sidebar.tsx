import { useState } from "react";
import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { to: "/", label: "Overview", icon: "\u25A6" },
  { to: "/settings", label: "Settings", icon: "\u2699" },
  { to: "/memory", label: "Memory", icon: "\u2630" },
  { to: "/mcp", label: "MCP Servers", icon: "\u2687" },
  { to: "/hooks", label: "Hooks", icon: "\u26A1" },
  { to: "/permissions", label: "Permissions", icon: "\u26E8" },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile header bar with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-900 border-b border-slate-700 flex items-center px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-300 hover:text-white p-1 -ml-1"
          aria-label="Toggle navigation"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
        <h1 className="text-sm font-bold text-white ml-3 tracking-tight">
          claude-ctl
        </h1>
        <span className="text-xs text-slate-500 ml-2">dashboard</span>
      </div>

      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — always visible on md+, slide-in overlay on mobile */}
      <aside
        className={`
          fixed md:relative z-50 md:z-auto
          flex flex-col w-60 bg-slate-900 text-slate-300 shrink-0
          h-full md:h-auto
          transition-transform duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="px-5 py-5 border-b border-slate-700">
          <h1 className="text-lg font-bold text-white tracking-tight">
            claude-ctl
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            configuration dashboard
          </p>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-700">
          <p className="text-xs text-slate-500">claude-ctl v0.1.0</p>
        </div>
      </aside>
    </>
  );
}
