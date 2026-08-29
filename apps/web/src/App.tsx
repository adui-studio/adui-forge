import { Route, Routes } from "react-router";
import { ApprovalsPage } from "./pages/Approvals.tsx";
import { HomePage } from "./pages/Home.tsx";
import { LoginPage } from "./pages/Login.tsx";
import { RunDetailPage } from "./pages/RunDetail.tsx";
import { RunsPage } from "./pages/Runs.tsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/approvals" element={<ApprovalsPage />} />
      <Route path="/runs" element={<RunsPage />} />
      <Route path="/runs/:id" element={<RunDetailPage />} />
    </Routes>
  );
}
