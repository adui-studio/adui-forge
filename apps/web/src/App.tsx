import { lazy, Suspense } from "react";
import { Spin } from "antd";
import { Route, Routes } from "react-router";
import { AppShell } from "./components/app-shell.tsx";

/* 路由级 code-splitting:每个页面独立 chunk,React Flow / Monaco 等重组件不再进首屏 */
const HomePage = lazy(() => import("./pages/Home.tsx").then((m) => ({ default: m.HomePage })));
const AgentsPage = lazy(() =>
  import("./pages/Agents.tsx").then((m) => ({ default: m.AgentsPage })),
);
const AgentDetailPage = lazy(() =>
  import("./pages/AgentDetail.tsx").then((m) => ({ default: m.AgentDetailPage })),
);
const ChatPage = lazy(() => import("./pages/Chat.tsx").then((m) => ({ default: m.ChatPage })));
const ApprovalsPage = lazy(() =>
  import("./pages/Approvals.tsx").then((m) => ({ default: m.ApprovalsPage })),
);
const LoginPage = lazy(() => import("./pages/Login.tsx").then((m) => ({ default: m.LoginPage })));
const McpPage = lazy(() => import("./pages/Mcp.tsx").then((m) => ({ default: m.McpPage })));
const SkillsPage = lazy(() =>
  import("./pages/Skills.tsx").then((m) => ({ default: m.SkillsPage })),
);
const MemoryPage = lazy(() =>
  import("./pages/Memory.tsx").then((m) => ({ default: m.MemoryPage })),
);
const WorkflowEditorPage = lazy(() =>
  import("./pages/WorkflowEditor.tsx").then((m) => ({ default: m.WorkflowEditorPage })),
);
const WorkflowsPage = lazy(() =>
  import("./pages/Workflows.tsx").then((m) => ({ default: m.WorkflowsPage })),
);
const RunDetailPage = lazy(() =>
  import("./pages/RunDetail.tsx").then((m) => ({ default: m.RunDetailPage })),
);
const RunsPage = lazy(() => import("./pages/Runs.tsx").then((m) => ({ default: m.RunsPage })));
const TasksPage = lazy(() => import("./pages/Tasks.tsx").then((m) => ({ default: m.TasksPage })));
const SettingsPage = lazy(() =>
  import("./pages/Settings.tsx").then((m) => ({ default: m.SettingsPage })),
);

const PageFallback = (
  <div className="flex justify-center py-24">
    <Spin />
  </div>
);

export function App() {
  return (
    <AppShell>
      <Suspense fallback={PageFallback}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agents/new" element={<AgentDetailPage />} />
          <Route path="/agents/:name" element={<AgentDetailPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/workflows/new" element={<WorkflowEditorPage isNew />} />
          <Route path="/workflows/:name/edit" element={<WorkflowEditorPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/runs/:id" element={<RunDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
