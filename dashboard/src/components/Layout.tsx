import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
