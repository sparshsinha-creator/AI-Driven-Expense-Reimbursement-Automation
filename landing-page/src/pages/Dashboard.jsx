import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineBanknotes,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineCalendarDays,
} from "react-icons/hi2";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useClaims } from "../hooks/useClaims";
import { useEmployees } from "../hooks/useEmployees";
import { getSessionClaims } from "../utils/sessionClaims";
import { formatUsd } from "../utils/format";
import StatCard from "../components/StatCard";
import WelcomeCard from "../components/WelcomeCard";
import ProfileCard from "../components/ProfileCard";
import QuickActions from "../components/QuickActions";
import PromoCards from "../components/PromoCards";
import NotificationsPanel from "../components/NotificationsPanel";
import RecentClaimsTable from "../components/RecentClaimsTable";
import ActivityFeed from "../components/ActivityFeed";
import MonthlyExpensesChart from "../components/MonthlyExpensesChart";
import DepartmentSpendingChart from "../components/DepartmentSpendingChart";
import FraudAlertsChart from "../components/FraudAlertsChart";
import CategoryChart from "../components/CategoryChart";
import StatusChart from "../components/StatusChart";
import PolicyModal from "../components/PolicyModal";

function isCurrentMonth(isoDate) {
  const d = new Date(isoDate);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function Dashboard() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const claims = useClaims();
  const employees = useEmployees();
  const [policyOpen, setPolicyOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    }
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  // "My claims" - the real claims tagged to this employee, plus anything
  // they've uploaded this session via Upload Receipt. The KPI cards and the
  // Fraud/Anomaly, Expense Category, and Routing Outcomes charts are all
  // scoped to this so two different logged-in employees see genuinely
  // different numbers. Department Spending and Monthly Expenses stay
  // company-wide - informational context to compare your own numbers against.
  const myRealClaims = claims.filter((c) => c.employee_id === currentUser.employee_id);
  const mySessionClaims = getSessionClaims().filter(
    (c) => c.employee_id === currentUser.employee_id
  );
  const myClaims = [...myRealClaims, ...mySessionClaims].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const totalToReimburse = myClaims
    .filter((c) => c.routed_status !== "rejected")
    .reduce((sum, c) => sum + c.amount_usd, 0);
  const pendingCount = myClaims.filter((c) => c.routed_status.startsWith("pending_")).length;
  const approvedCount = myClaims.filter((c) => c.routed_status === "auto_approved").length;
  const rejectedCount = myClaims.filter((c) => c.routed_status === "rejected").length;
  const currentMonthTotal = myClaims
    .filter((c) => isCurrentMonth(c.date))
    .reduce((sum, c) => sum + c.amount_usd, 0);

  return (
    <div className="dashboard-page personalized-dashboard">
      <div className="dashboard-top-grid">
        <WelcomeCard user={currentUser} />
        <ProfileCard user={currentUser} />
      </div>

      <QuickActions onOpenPolicy={() => setPolicyOpen(true)} />

      <div className="stats-grid">
        <StatCard
          label="Total to Reimburse"
          value={formatUsd(totalToReimburse)}
          icon={<HiOutlineBanknotes size={22} />}
        />
        <StatCard label="Pending Claims" value={pendingCount} icon={<HiOutlineClock size={22} />} />
        <StatCard
          label="Approved Claims"
          value={approvedCount}
          icon={<HiOutlineCheckCircle size={22} />}
        />
        <StatCard label="Rejected Claims" value={rejectedCount} icon={<HiOutlineXCircle size={22} />} />
        <StatCard
          label="This Month"
          value={formatUsd(currentMonthTotal)}
          icon={<HiOutlineCalendarDays size={22} />}
        />
      </div>

      <div className="dashboard-secondary-grid">
        <PromoCards />
        <NotificationsPanel claims={myClaims} />
      </div>

      <h2 className="section-title-sm">My recent claims</h2>
      <RecentClaimsTable claims={myClaims} />

      <h2 id="analytics-charts" className="section-title-sm">
        Analytics
      </h2>
      <div className="charts-grid">
        <MonthlyExpensesChart claims={claims} />
        <DepartmentSpendingChart claims={claims} employees={employees} />
        <FraudAlertsChart claims={myClaims} />
        <CategoryChart claims={myClaims} title="Your spend by category" />
        <StatusChart claims={myClaims} />
      </div>

      <ActivityFeed claims={myClaims} />

      <PolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} />
    </div>
  );
}
