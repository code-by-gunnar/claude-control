import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RefreshProvider } from "./lib/refresh-context";
import { Layout } from "./components/Layout";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { MemoryPage } from "./pages/MemoryPage";
import { McpPage } from "./pages/McpPage";
import { PluginsPage } from "./pages/PluginsPage";
import { MarketplacesPage } from "./pages/MarketplacesPage";
import { HooksPage } from "./pages/HooksPage";
import { AgentsPage } from "./pages/AgentsPage";
import { SkillsPage } from "./pages/SkillsPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { HealthPage } from "./pages/HealthPage";
import { ScanPage } from "./pages/ScanPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { HelpPage } from "./pages/HelpPage";

export function App() {
  return (
    <BrowserRouter>
      <RefreshProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<OverviewPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/marketplaces" element={<MarketplacesPage />} />
          <Route path="/hooks" element={<HooksPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/permissions" element={<PermissionsPage />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Routes>
      </RefreshProvider>
    </BrowserRouter>
  );
}
