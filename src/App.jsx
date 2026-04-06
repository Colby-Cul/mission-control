import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { MissionControlDataProvider } from './context/MissionControlDataContext';

const Home = lazy(() => import('./pages/Home'));
const ExecutiveOverview = lazy(() => import('./pages/ExecutiveOverview'));
const CommandDeck = lazy(() => import('./pages/CommandDeck'));
const Team = lazy(() => import('./pages/Team'));
const TheFloor = lazy(() => import('./pages/TheFloor'));
const Projects = lazy(() => import('./pages/Projects'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Finance = lazy(() => import('./pages/Finance'));
const TheForge = lazy(() => import('./pages/TheForge'));
const SkillLab = lazy(() => import('./pages/SkillLab'));
const ApiSkills = lazy(() => import('./pages/ApiSkills'));
const ActivityFeed = lazy(() => import('./pages/ActivityFeed'));
const Sessions = lazy(() => import('./pages/Sessions'));
const Memory = lazy(() => import('./pages/Memory'));
const DocsHub = lazy(() => import('./pages/DocsHub'));
const WorkspaceFiles = lazy(() => import('./pages/WorkspaceFiles'));
const SystemMonitor = lazy(() => import('./pages/SystemMonitor'));
const Rentals = lazy(() => import('./pages/Rentals'));
const IncidentRoom = lazy(() => import('./pages/IncidentRoom'));
const IntegrationsHub = lazy(() => import('./pages/IntegrationsHub'));
const Settings = lazy(() => import('./pages/Settings'));
const EntityMap = lazy(() => import('./pages/EntityMap'));

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
        <Suspense fallback={<div style={{padding:40,color:"#9ca3af",textAlign:"center"}}>Loading...</div>}>
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
        </Suspense>
      </Router>
    </MissionControlDataProvider>
  );
}

export default App;
