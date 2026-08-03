import { Link, Outlet, useLocation } from "react-router-dom";
import {
  HiOutlineShieldCheck,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineUserGroup,
  HiOutlineUser,
  HiOutlineBanknotes,
} from "react-icons/hi2";
import { useTheme } from "../hooks/useTheme";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useEmployees } from "../hooks/useEmployees";

export default function DashboardLayout() {
  const { theme, toggleTheme } = useTheme();
  const currentUser = useCurrentUser();
  const employees = useEmployees();
  const location = useLocation();

  // Finance is checked first and takes priority over the manager_id check
  // below - Omar Haddad (Finance) has no direct reports in the roster, but
  // he's still the resolved approver for every "finance" escalation
  // (route_decisions.py's resolve_finance_approver), so department alone
  // routes him to Finance View instead of the generic Manager View.
  const isFinance = !!currentUser && currentUser.department === "Finance";

  // A "manager" here is anyone who shows up as another employee's manager_id
  // in the roster - the same relationship the real pipeline's approver
  // resolution (route_decisions.py) is built on, not a separate role field.
  const isManager =
    !!currentUser && employees.some((e) => e.manager_id === currentUser.employee_id);

  const onManagerDashboard = location.pathname === "/manager-dashboard";
  const onFinanceDashboard = location.pathname === "/finance-dashboard";

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
            {isFinance ? (
              onFinanceDashboard ? (
                <Link to="/dashboard" className="btn btn-ghost">
                  <HiOutlineUser size={18} />
                  Employee View
                </Link>
              ) : (
                <Link to="/finance-dashboard" className="btn btn-ghost">
                  <HiOutlineBanknotes size={18} />
                  Finance View
                </Link>
              )
            ) : (
              isManager &&
              (onManagerDashboard ? (
                <Link to="/dashboard" className="btn btn-ghost">
                  <HiOutlineUser size={18} />
                  Employee View
                </Link>
              ) : (
                <Link to="/manager-dashboard" className="btn btn-ghost">
                  <HiOutlineUserGroup size={18} />
                  Manager View
                </Link>
              ))
            )}
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
