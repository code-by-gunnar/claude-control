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
  return (
    <aside className="flex flex-col w-60 bg-slate-900 text-slate-300 shrink-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white tracking-tight">
          claude-ctl
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">configuration dashboard</p>
      </div>

      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
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
  );
}
