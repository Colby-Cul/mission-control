import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { MissionControlDataProvider } from './context/MissionControlDataContext';
import {
  Home,
  CommandDeck,
  Team,
  TheFloor,
  Projects,
  Tasks,
  Finance,
  TheForge,
  SkillLab,
  ActivityFeed,
  Sessions,
  Memory,
  DocsHub,
  WorkspaceFiles,
  SystemMonitor,
  Rentals,
  Settings
} from './pages';

function App() {
  return (
    <MissionControlDataProvider>
      <Router basename="/mission-control">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="command" element={<CommandDeck />} />
            <Route path="team" element={<Team />} />
            <Route path="floor" element={<TheFloor />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="finance" element={<Finance />} />
            <Route path="forge" element={<TheForge />} />
            <Route path="skills" element={<SkillLab />} />
            <Route path="activity" element={<ActivityFeed />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="memory" element={<Memory />} />
            <Route path="docs" element={<DocsHub />} />
            <Route path="files" element={<WorkspaceFiles />} />
            <Route path="system" element={<SystemMonitor />} />
            <Route path="rentals" element={<Rentals />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Router>
    </MissionControlDataProvider>
  );
}

export default App;
