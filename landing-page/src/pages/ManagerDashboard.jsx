import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineClock,
  HiOutlineBanknotes,
  HiOutlineCalendarDays,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useClaims } from "../hooks/useClaims";
import { useEmployees } from "../hooks/useEmployees";
import { formatUsd } from "../utils/format";
import WelcomeCard from "../components/WelcomeCard";
import ProfileCard from "../components/ProfileCard";
import StatCard from "../components/StatCard";
import MonthlyExpensesChart from "../components/MonthlyExpensesChart";
import DepartmentSpendingChart from "../components/DepartmentSpendingChart";
import FraudAlertsChart from "../components/FraudAlertsChart";
import CategoryChart from "../components/CategoryChart";
import StatusChart from "../components/StatusChart";
import ApprovalQueue from "../components/ApprovalQueue";
import ClaimReviewModal from "../components/ClaimReviewModal";
import {
  getManagerActions,
  setClaimStatusOverride,
  addClaimComment,
} from "../utils/managerActions";

function isCurrentMonth(isoDate) {
  const d = new Date(isoDate);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export default function ManagerDashboard() {
  const currentUser = useCurrentUser();
  const navigate = useNavigate();
  const claims = useClaims();
  const employees = useEmployees();

  // Same manager relationship DashboardLayout uses to decide whether to show
  // the nav link - checked again here so a non-manager can't reach this page
  // by typing the URL directly.
  const isManager =
    !!currentUser && employees.some((e) => e.manager_id === currentUser.employee_id);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!isManager) {
      navigate("/dashboard");
    }
  }, [currentUser, isManager, navigate]);

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [managerActions, setManagerActions] = useState(() => getManagerActions());

  if (!currentUser || !isManager) {
    return null;
  }

  // Every claim currently resolved to this manager as approver - both
  // actionable claims (approval_action_required) and record-keeping-only
  // ones (e.g. a rejected claim still lists its manager for the record),
  // the same breadth Dashboard.jsx's myClaims uses for an employee's own
  // claims. Session-uploaded claims never get an approver_id (routing
  // hasn't run on them), so they're correctly excluded without special-casing.
  const myTeamClaims = claims.filter((c) => c.approver_id === currentUser.employee_id);

  // "Still awaiting a decision" - approval_action_required is real pipeline
  // data and never changes, but a claim the manager has already acted on
  // this session (approved/rejected/escalated) shouldn't keep counting
  // toward the pending KPIs even though it stays visible in the queue table.
  const pendingClaims = myTeamClaims.filter(
    (c) => c.approval_action_required && !managerActions[c.receipt_id]?.statusOverride
  );
  const totalPending = pendingClaims.reduce((sum, c) => sum + c.amount_usd, 0);
  const teamSpendThisMonth = myTeamClaims
    .filter((c) => isCurrentMonth(c.date))
    .reduce((sum, c) => sum + c.amount_usd, 0);
  const flaggedCount = pendingClaims.filter(
    (c) => c.risk_score === "high" || c.is_duplicate === true || c.is_outlier === true
  ).length;

  function handleStatusChange(receiptId, status) {
    setManagerActions(setClaimStatusOverride(receiptId, status));
  }

  function handleAddComment(receiptId, comment) {
    setManagerActions(addClaimComment(receiptId, comment));
  }

  return (
    <div className="dashboard-page personalized-dashboard">
      <div className="dashboard-top-grid">
        <WelcomeCard user={currentUser} employees={employees} />
        <ProfileCard user={currentUser} />
      </div>

      <h2 className="section-title-sm">Manager Dashboard - Approvals for your team</h2>

      <div className="stats-grid">
        <StatCard
          label="Pending My Approval"
          value={pendingClaims.length}
          icon={<HiOutlineClock size={22} />}
        />
        <StatCard
          label="Total $ Pending"
          value={formatUsd(totalPending)}
          icon={<HiOutlineBanknotes size={22} />}
        />
        <StatCard
          label="Team Spend This Month"
          value={formatUsd(teamSpendThisMonth)}
          icon={<HiOutlineCalendarDays size={22} />}
        />
        <StatCard
          label="Flagged / High-Risk"
          value={flaggedCount}
          icon={<HiOutlineExclamationTriangle size={22} />}
        />
      </div>

      <h2 className="section-title-sm">Team analytics</h2>
      <div className="charts-grid">
        <MonthlyExpensesChart claims={myTeamClaims} />
        <DepartmentSpendingChart claims={myTeamClaims} employees={employees} />
        <FraudAlertsChart claims={myTeamClaims} />
        <CategoryChart claims={myTeamClaims} title="Team spend by category" />
        <StatusChart claims={myTeamClaims} />
      </div>

      <h2 className="section-title-sm">Approval queue</h2>
      <ApprovalQueue
        claims={myTeamClaims}
        managerActions={managerActions}
        selectedReceiptId={selectedClaim?.receipt_id ?? null}
        onSelect={setSelectedClaim}
      />

      <ClaimReviewModal
        claim={selectedClaim}
        managerAction={selectedClaim ? managerActions[selectedClaim.receipt_id] : undefined}
        employees={employees}
        currentUser={currentUser}
        onClose={() => setSelectedClaim(null)}
        onStatusChange={handleStatusChange}
        onAddComment={handleAddComment}
      />
    </div>
  );
}
