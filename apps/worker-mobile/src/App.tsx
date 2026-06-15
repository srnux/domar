import { Navigate, Route, Routes } from "react-router";
import { WorkerLayout } from "./WorkerLayout";
import BidsPage from "./pages/BidsPage";
import JobDetailPage from "./pages/JobDetailPage";
import LoginPage from "./pages/LoginPage";
import MyDayPage from "./pages/MyDayPage";
import MyWeekPage from "./pages/MyWeekPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<WorkerLayout />}>
        <Route path="/my-day" element={<MyDayPage />} />
        <Route path="/my-week" element={<MyWeekPage />} />
        <Route path="/bids" element={<BidsPage />} />
        <Route path="/my-jobs/:id" element={<JobDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/my-day" replace />} />
    </Routes>
  );
}
