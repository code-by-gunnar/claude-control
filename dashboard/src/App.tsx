import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { MemoryPage } from "./pages/MemoryPage";
import { McpPage } from "./pages/McpPage";

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
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/mcp" element={<McpPage />} />
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
