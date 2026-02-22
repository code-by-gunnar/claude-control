import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { MemoryPage } from "./pages/MemoryPage";
import { McpPage } from "./pages/McpPage";
import { PluginsPage } from "./pages/PluginsPage";
import { HooksPage } from "./pages/HooksPage";
import { SkillsPage } from "./pages/SkillsPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { HealthPage } from "./pages/HealthPage";
import { ProjectsPage } from "./pages/ProjectsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/hooks" element={<HooksPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
