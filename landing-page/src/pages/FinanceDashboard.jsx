import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import {
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlineDocumentDuplicate,
  HiOutlineLockClosed,
  HiOutlineCalendarDays,
} from "react-icons/hi2";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useClaims } from "../hooks/useClaims";
import { useEmployees } from "../hooks/useEmployees";
import { formatUsd, formatStatus } from "../utils/format";
import StatCard from "../components/StatCard";
import DepartmentSpendingChart from "../components/DepartmentSpendingChart";
import CostCenterChart from "../components/CostCenterChart";
import ApprovalFunnelChart from "../components/ApprovalFunnelChart";
import FinanceQueueTable from "../components/FinanceQueueTable";
import SecurityAuditPanel from "../components/SecurityAuditPanel";
import {
  getFinanceActions,
  setClaimStatusOverride,
  addClaimComment,
  setPaymentHeld,
  getEffectiveStatus,
} from "../utils/financeActions";

export default function FinanceDashboard() {
  const currentUser = useCurrentUser();
  const claims = useClaims();
  const employees = useEmployees();
  const navigate = useNavigate();

  const isFinance = !!currentUser && currentUser.department === "Finance";
  const [financeActions, setFinanceActions] = useState(() => getFinanceActions());

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    if (!isFinance) {
      navigate("/dashboard");
    }
  }, [currentUser, isFinance, navigate]);

  if (!currentUser || !isFinance) {
    return null;
  }

  // All finance-escalated claims, regardless of who submitted them - the
  // real pipeline (route_decisions.py's resolve_finance_approver) routes
  // every approver_level === "finance" claim to the same Finance approver,
  // so this is keyed on approver_level, not approver_id like the manager
  // queue is.
  const financeQueue = claims.filter((c) => c.approver_level === "finance");
  const financeQueueTotal = financeQueue.reduce((sum, c) => sum + c.amount_usd, 0);

  console.log(
    `Finance queue: ${financeQueue.length} claim(s), ${formatUsd(financeQueueTotal)} total`,
    financeQueue.map((c) => c.receipt_id)
  );

  // "Still awaiting a decision" - approval_action_required is real pipeline
  // data and never changes, but a claim already acted on this session
  // (verified/approved or rejected) shouldn't keep counting toward the
  // pending KPI even though it stays visible in the queue table below.
  const pendingFinanceReview = financeQueue.filter(
    (c) => c.approval_action_required && !financeActions[c.receipt_id]?.statusOverride
  );
  const pendingFinanceReviewTotal = pendingFinanceReview.reduce(
    (sum, c) => sum + c.amount_usd,
    0
  );
  const fraudHighRiskCount = financeQueue.filter(
    (c) => c.risk_score === "high" || c.is_outlier === true
  ).length;
  const duplicateCount = financeQueue.filter((c) => c.is_duplicate === true).length;

  // Hold/release is brand new session-local state (financeActions.js's
  // paymentHeld flag) - not connected to any existing payment file, per the
  // request. Purely derived from this session's own actions.
  const heldClaims = financeQueue.filter((c) => financeActions[c.receipt_id]?.paymentHeld === true);
  const heldTotal = heldClaims.reduce((sum, c) => sum + c.amount_usd, 0);

  // Every claim in financeQueue currently falls in the same month (Jul
  // 2026), the same single bar the now-removed Monthly Expenses chart used
  // to show - so the queue's total IS that month's figure. If the queue
  // ever spans multiple months this KPI would need its own month bucketing,
  // but there's no chart left on this page to keep it in sync with.
  const thisMonthTotal = financeQueueTotal;

  function handleStatusChange(receiptId, status) {
    setFinanceActions(setClaimStatusOverride(receiptId, status));
  }

  function handleAddComment(receiptId, comment) {
    setFinanceActions(addClaimComment(receiptId, comment));
  }

  function handleTogglePaymentHold(receiptId, held) {
    setFinanceActions(setPaymentHeld(receiptId, held));
  }

  // Real export of whatever's currently in financeQueue - not a canned
  // sample file. Built client-side with a Blob + temporary <a>, no new
  // dependency needed.
  function handleExportCsv() {
    const columns = [
      "receipt_id",
      "employee_id",
      "employee_name",
      "vendor",
      "category",
      "amount_usd",
      "currency",
      "risk_score",
      "confidence_score",
      "decision",
      "is_duplicate",
      "duplicate_of",
      "routed_status",
    ];

    function escapeCsvValue(value) {
      const str = value === null || value === undefined ? "" : String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const rows = financeQueue.map((c) =>
      columns
        .map((col) =>
          escapeCsvValue(col === "duplicate_of" ? c.duplicate_of.join("; ") : c[col])
        )
        .join(",")
    );
    const csv = [columns.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finance_queue_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Same jsPDF pattern as UploadReceipt.jsx's Download Reimbursement
  // Statement and ClaimReviewModal.jsx's Download Receipt/AI Report.
  function handleDownloadAuditReport() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Finance Audit Report", 20, 20);

    doc.setFontSize(11);
    doc.text("AI-Driven Expense Reimbursement Automation — Meridian Corp", 20, 28);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 20, 34);
    doc.text(`Prepared by: ${currentUser.name} (${currentUser.employee_id})`, 20, 40);

    doc.setFontSize(12);
    doc.text("Summary", 20, 54);
    doc.setFontSize(10);
    const summaryLines = [
      `Finance queue: ${financeQueue.length} claim(s), ${formatUsd(financeQueueTotal)} total`,
      `Pending finance review: ${pendingFinanceReview.length} (${formatUsd(pendingFinanceReviewTotal)})`,
      `Fraud / high-risk: ${fraudHighRiskCount}`,
      `Duplicate claims: ${duplicateCount}`,
      `Total held: ${heldClaims.length} (${formatUsd(heldTotal)})`,
    ];
    let y = 61;
    for (const line of summaryLines) {
      doc.text(line, 20, y);
      y += 7;
    }

    y += 5;
    doc.setFontSize(12);
    doc.text("Claims", 20, y);
    y += 8;
    doc.setFontSize(9);
    for (const c of financeQueue) {
      const effectiveStatus = getEffectiveStatus(c, financeActions);
      doc.text(
        `${c.receipt_id}  ${c.vendor}  ${formatUsd(c.amount_usd)}  risk=${c.risk_score}  ${formatStatus(
          effectiveStatus
        )}`,
        20,
        y
      );
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    }

    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize(
        "This report reflects the finance queue and session actions at the time of download.",
        170
      ),
      20,
      y + 8
    );

    doc.save(`Finance_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="dashboard-page personalized-dashboard">
      <h2 className="section-title-sm">Finance Dashboard</h2>
      <p className="section-sub">
        Every claim routed to Finance ({financeQueue.length} total, {formatUsd(financeQueueTotal)}
        ), regardless of who submitted it.
      </p>

      <div className="stats-grid">
        <StatCard
          label="Pending Finance Review"
          value={`${pendingFinanceReview.length} (${formatUsd(pendingFinanceReviewTotal)})`}
          icon={<HiOutlineClock size={22} />}
        />
        <StatCard
          label="Fraud / High-Risk Count"
          value={fraudHighRiskCount}
          icon={<HiOutlineExclamationTriangle size={22} />}
        />
        <StatCard
          label="Duplicate Claims Count"
          value={duplicateCount}
          icon={<HiOutlineDocumentDuplicate size={22} />}
        />
        <StatCard
          label="Total Held"
          value={`${heldClaims.length} (${formatUsd(heldTotal)})`}
          icon={<HiOutlineLockClosed size={22} />}
        />
        <StatCard
          label="This Month"
          value={formatUsd(thisMonthTotal)}
          icon={<HiOutlineCalendarDays size={22} />}
        />
      </div>

      <h2 className="section-title-sm">Finance analytics</h2>
      <div className="charts-grid">
        <DepartmentSpendingChart claims={financeQueue} employees={employees} />
        <ApprovalFunnelChart claims={claims} />
        <CostCenterChart claims={financeQueue} employees={employees} />
      </div>

      <h2 className="section-title-sm">Finance queue</h2>
      <div className="auth-actions-row">
        <button type="button" className="btn btn-ghost auth-submit" onClick={handleExportCsv}>
          Export CSV
        </button>
        <button
          type="button"
          className="btn btn-ghost auth-submit"
          onClick={handleDownloadAuditReport}
        >
          Download Audit Report
        </button>
      </div>
      <FinanceQueueTable
        claims={financeQueue}
        employees={employees}
        financeActions={financeActions}
        currentUser={currentUser}
        onStatusChange={handleStatusChange}
        onAddComment={handleAddComment}
        onTogglePaymentHold={handleTogglePaymentHold}
      />

      <SecurityAuditPanel />
    </div>
  );
}
