import { Link, Outlet } from "react-router-dom";
import {
  HiOutlineShieldCheck,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineSun,
  HiOutlineMoon,
} from "react-icons/hi2";
import { useTheme } from "../hooks/useTheme";

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="dashboard-layout">
      <header className="dashboard-topbar">
        <div className="container dashboard-topbar-inner">
          <Link to="/" className="navbar-brand">
            <HiOutlineShieldCheck size={22} />
            <span>ClaimPilot AI</span>
          </Link>
          <div className="dashboard-topbar-actions">
            <button
              type="button"
              className="chat-icon-btn theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <HiOutlineSun size={18} /> : <HiOutlineMoon size={18} />}
            </button>
            <Link to="/" className="btn btn-ghost">
              <HiOutlineArrowLeftOnRectangle size={18} />
              Exit demo
            </Link>
          </div>
        </div>
      </header>
      <main className="dashboard-main">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
