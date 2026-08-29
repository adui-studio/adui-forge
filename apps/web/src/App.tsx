import { Route, Routes } from "react-router";
import { HomePage } from "./pages/Home.tsx";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}
