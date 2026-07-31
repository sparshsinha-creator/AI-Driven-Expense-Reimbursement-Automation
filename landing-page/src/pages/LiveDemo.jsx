import { useClaims } from "../hooks/useClaims";
import CategoryChart from "../components/CategoryChart";
import StatusChart from "../components/StatusChart";
import ClaimsTable from "../components/ClaimsTable";
import StatCard from "../components/StatCard";
import {
  HiOutlineDocumentMagnifyingGlass,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";

// Public, no-login-required aggregate view - the one-click "watch the demo"
// experience. The personalized, login-gated view lives at /dashboard.
export default function LiveDemo() {
  const claims = useClaims();

  const autoApproved = claims.filter((c) => c.routed_status === "auto_approved").length;
  const pendingReview = claims.filter((c) => c.routed_status.startsWith("pending_")).length;
  const highRisk = claims.filter((c) => c.risk_score === "high").length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Claims overview</h1>
        <p className="section-sub">
          These are the 12 real transactions produced by this project's own extraction,
          validation, anomaly-detection, and routing pipeline.
        </p>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Total claims"
          value={claims.length}
          icon={<HiOutlineDocumentMagnifyingGlass size={22} />}
        />
        <StatCard label="Auto-approved" value={autoApproved} icon={<HiOutlineCheckCircle size={22} />} />
        <StatCard label="Pending review" value={pendingReview} icon={<HiOutlineClock size={22} />} />
        <StatCard
          label="High-risk flags"
          value={highRisk}
          icon={<HiOutlineExclamationTriangle size={22} />}
        />
      </div>

      <div className="charts-grid">
        <CategoryChart claims={claims} />
        <StatusChart claims={claims} />
      </div>

      <h2 className="section-title-sm">All claims</h2>
      <ClaimsTable claims={claims} />
    </div>
  );
}
