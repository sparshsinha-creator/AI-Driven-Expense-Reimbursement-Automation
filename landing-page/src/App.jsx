import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import FinanceDashboard from "./pages/FinanceDashboard";
import LiveDemo from "./pages/LiveDemo";
import UploadReceipt from "./pages/UploadReceipt";
import ChatAssistant from "./components/ChatAssistant";
import { useTheme } from "./hooks/useTheme";

function App() {
  useTheme();

  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          <Route path="/finance-dashboard" element={<FinanceDashboard />} />
          <Route path="/live-demo" element={<LiveDemo />} />
          <Route path="/upload-receipt" element={<UploadReceipt />} />
        </Route>
      </Routes>
      <ChatAssistant />
    </>
  );
}

export default App;
