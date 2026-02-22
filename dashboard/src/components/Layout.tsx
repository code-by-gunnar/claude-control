import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto pt-16 md:pt-8">
        <Outlet />
      </main>
    </div>
  );
}
