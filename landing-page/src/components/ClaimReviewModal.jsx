import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import { HiOutlineXMark } from "react-icons/hi2";
import StatusBadge from "./StatusBadge";
import { formatUsd, formatDate, formatCategory, formatStatus, statusTone } from "../utils/format";

export default function ClaimReviewModal({
  claim,
  managerAction,
  employees,
  currentUser,
  onClose,
  onStatusChange,
  onAddComment,
}) {
  const [justificationOpen, setJustificationOpen] = useState(false);
  const [justificationMessage, setJustificationMessage] = useState("");
  const [commentText, setCommentText] = useState("");

  // Reset the modal's own transient form state whenever a different claim is
  // selected - the component instance stays mounted across selections (only
  // the `claim` prop changes), so this can't rely on remount-on-open alone.
  useEffect(() => {
    setJustificationOpen(false);
    setJustificationMessage("");
    setCommentText("");
  }, [claim?.receipt_id]);

  if (!claim) {
    return null;
  }

  const employee = employees.find((e) => e.employee_id === claim.employee_id);
  const comments = managerAction?.comments ?? [];
  const effectiveStatus = managerAction?.statusOverride ?? claim.routed_status;

  function handleApprove() {
    onStatusChange(claim.receipt_id, "auto_approved");
  }

  function handleReject() {
    onStatusChange(claim.receipt_id, "rejected");
  }

  function handleEscalate() {
    onStatusChange(claim.receipt_id, "pending_finance_approval");
  }

  function handleSubmitJustification(e) {
    e.preventDefault();
    const trimmed = justificationMessage.trim();
    if (!trimmed || !employee) return;

    const subject = `Additional justification needed for ${claim.receipt_id}`;
    const mailtoUrl = `mailto:${employee.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(trimmed)}`;
    window.location.href = mailtoUrl;

    onAddComment(claim.receipt_id, {
      text: `[Justification requested] ${trimmed}`,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
    });
    setJustificationOpen(false);
    setJustificationMessage("");
  }

  function handleAddComment(e) {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;

    onAddComment(claim.receipt_id, {
      text: trimmed,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
    });
    setCommentText("");
  }

  function handleDownloadReceipt() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Reconstructed Receipt", 20, 20);

    doc.setFontSize(11);
    doc.text("AI-Driven Expense Reimbursement Automation — Meridian Corp", 20, 28);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 20, 34);

    doc.setFontSize(12);
    doc.text("Claim", 20, 48);
    doc.setFontSize(10);
    doc.text(`Receipt ID: ${claim.receipt_id}`, 20, 55);
    doc.text(`Vendor: ${claim.vendor}`, 20, 61);
    doc.text(`Date: ${formatDate(claim.date)}`, 20, 67);
    doc.text(
      `Employee: ${employee ? employee.name : claim.employee_name} (${claim.employee_id})`,
      20,
      73
    );

    doc.setFontSize(12);
    doc.text("Line Items", 20, 87);
    doc.setFontSize(10);
    let y = 94;
    for (const item of claim.line_items) {
      doc.text(String(item.description), 20, y);
      doc.text(`${claim.currency} ${item.amount}`, 140, y);
      y += 7;
    }

    y += 3;
    doc.setFontSize(11);
    doc.text(`Total: ${claim.currency} ${claim.amount} (${formatUsd(claim.amount_usd)})`, 20, y);

    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize(
        "Reconstructed from extracted data - no original receipt file is stored in this system.",
        170
      ),
      20,
      y + 12
    );

    doc.save(`Reconstructed_Receipt_${claim.receipt_id}.pdf`);
  }

  function handleDownloadAiReport() {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("AI Explanation Report", 20, 20);

    doc.setFontSize(11);
    doc.text("AI-Driven Expense Reimbursement Automation — Meridian Corp", 20, 28);

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString("en-US")}`, 20, 34);

    doc.setFontSize(12);
    doc.text(`Claim ${claim.receipt_id} - ${claim.vendor}`, 20, 48);
    doc.setFontSize(10);
    doc.text(`Extraction confidence: ${Math.round(claim.confidence_score * 100)}%`, 20, 55);

    let y = 69;
    const sections = [
      ["Policy reasoning (Phase 3)", claim.reason],
      ["Risk assessment (Phase 4)", claim.risk_explanation],
      ["AI approval summary (Phase 5)", claim.summary],
    ];
    for (const [label, text] of sections) {
      doc.setFontSize(12);
      doc.text(label, 20, y);
      y += 7;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(text, 170);
      doc.text(lines, 20, y);
      y += lines.length * 6 + 8;
    }

    doc.save(`AI_Report_${claim.receipt_id}.pdf`);
  }

  return (
    <AnimatePresence>
      {claim && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="card modal-panel modal-panel-wide"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                {claim.receipt_id} - {claim.vendor}
              </h3>
              <button type="button" className="chat-icon-btn" onClick={onClose} aria-label="Close">
                <HiOutlineXMark size={18} />
              </button>
            </div>
            <p className="modal-sub">
              Submitted by <strong>{employee ? employee.name : claim.employee_name}</strong> (
              {claim.employee_id}){employee?.department && ` - ${employee.department}`}
            </p>

            <div className="claim-review-status-row">
              <StatusBadge tone={statusTone(effectiveStatus)}>
                {formatStatus(effectiveStatus)}
              </StatusBadge>
              <span>
                {formatDate(claim.date)} &middot; {formatUsd(claim.amount_usd)} &middot;{" "}
                {formatCategory(claim.category)}
              </span>
            </div>

            <div className="policy-list">
              <div className="policy-row">
                <div className="policy-row-top">
                  <strong>Line items</strong>
                </div>
                {claim.line_items.map((item, i) => (
                  <p key={i}>
                    {item.description} - {claim.currency} {item.amount}
                  </p>
                ))}
              </div>

              <div className="policy-row">
                <div className="policy-row-top">
                  <strong>Extraction confidence</strong>
                  <span className="badge badge-neutral">
                    {Math.round(claim.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              <div className="policy-row">
                <div className="policy-row-top">
                  <strong>Policy reasoning (Phase 3)</strong>
                </div>
                <p>{claim.reason}</p>
              </div>

              <div className="policy-row">
                <div className="policy-row-top">
                  <strong>Risk assessment (Phase 4)</strong>
                </div>
                <p>{claim.risk_explanation}</p>
              </div>

              <div className="policy-row">
                <div className="policy-row-top">
                  <strong>AI approval summary (Phase 5)</strong>
                </div>
                <p>{claim.summary}</p>
              </div>

              <div className="policy-row">
                <div className="policy-row-top">
                  <strong>System routing decision</strong>
                </div>
                <p>
                  Routed to {claim.approver_level === "finance" ? "Finance" : "your direct approval"}{" "}
                  by approval_matrix.json's deterministic rule: &ldquo;{claim.matched_condition}
                  &rdquo;. This routing is rule-based, not a live AI judgment call - the reasoning
                  above (Phase 3/4) is where Claude's actual analysis happened.
                </p>
              </div>
            </div>

            {claim.is_duplicate && (
              <p className="auth-note">
                Flagged as a duplicate of {claim.duplicate_of.join(", ")}.
              </p>
            )}

            <div className="auth-actions-row">
              <button type="button" className="btn btn-primary auth-submit" onClick={handleApprove}>
                Approve
              </button>
              <button type="button" className="btn btn-ghost auth-submit" onClick={handleReject}>
                Reject
              </button>
              <button type="button" className="btn btn-ghost auth-submit" onClick={handleEscalate}>
                Escalate to Finance
              </button>
              <button
                type="button"
                className="btn btn-ghost auth-submit"
                onClick={() => setJustificationOpen((v) => !v)}
              >
                Request Additional Justification
              </button>
            </div>

            {justificationOpen && (
              <form className="auth-form" onSubmit={handleSubmitJustification}>
                <label>
                  Message to {employee ? employee.name : claim.employee_name}
                  <textarea
                    rows={4}
                    value={justificationMessage}
                    onChange={(e) => setJustificationMessage(e.target.value)}
                    placeholder="What additional justification do you need?"
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary auth-submit"
                  disabled={!justificationMessage.trim() || !employee}
                >
                  Send Request
                </button>
                {!employee && (
                  <p className="auth-note">
                    No employee record found for {claim.employee_id} - can't resolve an email to
                    send this to.
                  </p>
                )}
              </form>
            )}

            <h4>Comments</h4>
            {comments.length === 0 ? (
              <p className="claims-empty">No comments yet.</p>
            ) : (
              <ul className="activity-list">
                {comments.map((c, i) => (
                  <li key={i} className="activity-item">
                    <span className="activity-dot" />
                    <div className="activity-body">
                      <div className="activity-top">
                        <strong>{c.author}</strong>
                      </div>
                      <span className="activity-meta">
                        {new Date(c.timestamp).toLocaleString()}
                      </span>
                      <p>{c.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <form className="auth-form" onSubmit={handleAddComment}>
              <label>
                Add a comment
                <textarea
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add an internal comment..."
                />
              </label>
              <button type="submit" className="btn btn-ghost btn-sm" disabled={!commentText.trim()}>
                Add Comment
              </button>
            </form>

            <div className="auth-actions-row">
              <button
                type="button"
                className="btn btn-ghost auth-submit"
                onClick={handleDownloadReceipt}
              >
                Download Receipt
              </button>
              <button
                type="button"
                className="btn btn-ghost auth-submit"
                onClick={handleDownloadAiReport}
              >
                Download AI Report
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
