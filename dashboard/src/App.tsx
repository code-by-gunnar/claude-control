import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { MemoryPage } from "./pages/MemoryPage";
import { McpPage } from "./pages/McpPage";
import { HooksPage } from "./pages/HooksPage";
import { PermissionsPage } from "./pages/PermissionsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/hooks" element={<HooksPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
