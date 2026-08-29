import { Route, Routes } from "react-router";
import { HomePage } from "./pages/Home.tsx";
import { RunDetailPage } from "./pages/RunDetail.tsx";
import { RunsPage } from "./pages/Runs.tsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/runs" element={<RunsPage />} />
      <Route path="/runs/:id" element={<RunDetailPage />} />
    </Routes>
  );
}
