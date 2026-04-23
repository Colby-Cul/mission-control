import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { MissionControlDataProvider } from './context/MissionControlDataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';

const Home = lazy(() => import('./pages/Home'));
const NorthStar = lazy(() => import('./pages/NorthStar'));
const VisionBoard = lazy(() => import('./pages/VisionBoard'));
const CashFlowPage = lazy(() => import('./pages/CashFlowPage'));
const TaxCenter = lazy(() => import('./pages/TaxCenter'));
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
const Accounts = lazy(() => import('./pages/Accounts'));
const LegalDocs = lazy(() => import('./pages/LegalDocs'));
const PhotoManager = lazy(() => import('./pages/PhotoManager'));
const FinanceDashboard = lazy(() => import('./pages/FinanceDashboard'));
const XomeDashboard = lazy(() => import('./pages/XomeDashboard'));
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'));
const MarketingDashboard = lazy(() => import('./pages/MarketingDashboard'));
const InvestingCommand = lazy(() => import('./pages/InvestingCommand'));

// ── Public guest portal (no auth required) ──
const GuestPortal = lazy(() => import('./pages/GuestPortal'));

function normalizeBasePath(baseUrl) {
  if (!baseUrl || baseUrl === "/") {
    return "/";
  }
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

const Fallback = (
  <div style={{ padding: 40, color: "#9ca3af", textAlign: "center" }}>Loading...</div>
);

function App() {
  const basePath = normalizeBasePath(import.meta.env.BASE_URL || "/mission-control/");
  const routerMode = String(import.meta.env.VITE_ROUTER_MODE || "").toLowerCase();
  const useBrowserRouter = routerMode === "browser";
  const Router = useBrowserRouter ? BrowserRouter : HashRouter;
  const routerProps = useBrowserRouter ? { basename: basePath } : {};

  return (
    <Router {...routerProps}>
      <Suspense fallback={Fallback}>
        <Routes>
          {/* ── PUBLIC: Guest portal — no auth, no sidebar ── */}
          <Route path="/guest/:propertySlug" element={<GuestPortal />} />

          {/* ── AUTHENTICATED APP ── */}
          <Route
            path="/*"
            element={
              <AuthProvider>
                <AuthGate>
                  <MissionControlDataProvider>
                    <Routes>
                      <Route path="/" element={<Layout />}>
                        <Route index element={<NorthStar />} />
                        <Route path="home" element={<Home />} />
                        <Route path="north-star" element={<NorthStar />} />
                        <Route path="vision-board" element={<VisionBoard />} />
                        <Route path="cash-flow" element={<CashFlowPage />} />
                        <Route path="tax-center" element={<TaxCenter />} />
                        <Route path="overview" element={<ExecutiveOverview />} />
                        <Route path="command" element={<CommandDeck />} />
                        <Route path="team" element={<Team />} />
                        <Route path="floor" element={<TheFloor />} />
                        <Route path="projects" element={<Projects />} />
                        <Route path="tasks" element={<Tasks />} />
                        <Route path="finance" element={<FinanceDashboard />} />
                        <Route path="finance-legacy" element={<Finance />} />
                        <Route path="xome" element={<XomeDashboard />} />
                        <Route path="company" element={<CompanyDashboard />} />
                        <Route path="marketing" element={<MarketingDashboard />} />
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
                        <Route path="photo-manager" element={<PhotoManager />} />
                        <Route path="incidents" element={<IncidentRoom />} />
                        <Route path="integrations" element={<IntegrationsHub />} />
                        <Route path="accounts" element={<Accounts />} />
                        <Route path="legal-docs" element={<LegalDocs />} />
                        <Route path="investing" element={<InvestingCommand />} />
                        <Route path="entity-map" element={<EntityMap />} />
                        <Route path="settings" element={<Settings />} />
                      </Route>
                    </Routes>
                  </MissionControlDataProvider>
                </AuthGate>
              </AuthProvider>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}

function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#9ca3af", fontSize: 14 }}>Authenticating...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return children;
}

export default App;
