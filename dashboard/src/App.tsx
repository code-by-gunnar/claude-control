import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OverviewPage } from "./pages/OverviewPage";

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-400 text-lg">
      {title} — Coming soon
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route
            path="/settings"
            element={<PlaceholderPage title="Settings" />}
          />
          <Route path="/memory" element={<PlaceholderPage title="Memory" />} />
          <Route
            path="/mcp"
            element={<PlaceholderPage title="MCP Servers" />}
          />
          <Route path="/hooks" element={<PlaceholderPage title="Hooks" />} />
          <Route
            path="/permissions"
            element={<PlaceholderPage title="Permissions" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
