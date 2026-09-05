import { AppShell } from "./components/app-shell.tsx";
import { Route, Routes } from "react-router";
import { ApprovalsPage } from "./pages/Approvals.tsx";
import { HomePage } from "./pages/Home.tsx";
import { LoginPage } from "./pages/Login.tsx";
import { WorkflowsPage } from "./pages/Workflows.tsx";
import { RunDetailPage } from "./pages/RunDetail.tsx";
import { RunsPage } from "./pages/Runs.tsx";
import { SettingsPage } from "./pages/Settings.tsx";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:id" element={<RunDetailPage />} />
      </Routes>
    </AppShell>
  );
}
