import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { MissionControlDataProvider } from './context/MissionControlDataContext';
import {
  ExecutiveOverview,
  Home,
  CommandDeck,
  Team,
  TheFloor,
  Projects,
  Tasks,
  Finance,
  TheForge,
  SkillLab,
  ApiSkills,
  ActivityFeed,
  Sessions,
  Memory,
  DocsHub,
  WorkspaceFiles,
  SystemMonitor,
  Rentals,
  IncidentRoom,
  IntegrationsHub,
  Settings,
  EntityMap
} from './pages';

function normalizeBasePath(baseUrl) {
  if (!baseUrl || baseUrl === "/") {
    return "/";
  }

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function App() {
  const basePath = normalizeBasePath(import.meta.env.BASE_URL || "/mission-control/");
  const routerMode = String(import.meta.env.VITE_ROUTER_MODE || "").toLowerCase();
  const useBrowserRouter = routerMode === "browser";
  const Router = useBrowserRouter ? BrowserRouter : HashRouter;
  const routerProps = useBrowserRouter ? { basename: basePath } : {};

  return (
    <MissionControlDataProvider>
      <Router {...routerProps}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="overview" element={<ExecutiveOverview />} />
            <Route path="command" element={<CommandDeck />} />
            <Route path="team" element={<Team />} />
            <Route path="floor" element={<TheFloor />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="finance" element={<Finance />} />
            <Route path="forge" element={<TheForge />} />
            <Route path="skills" element={<SkillLab />} />
            <Route path="api-skills" element={<ApiSkills />} />
            <Route path="activity" element={<ActivityFeed />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="memory" element={<Memory />} />
            <Route path="docs" element={<DocsHub />} />
            <Route path="files" element={<WorkspaceFiles />} />
            <Route path="system" element={<SystemMonitor />} />
            <Route path="rentals" element={<Rentals />} />
            <Route path="incidents" element={<IncidentRoom />} />
            <Route path="integrations" element={<IntegrationsHub />} />
            <Route path="entity-map" element={<EntityMap />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </MissionControlDataProvider>
  );
}

export default App;
