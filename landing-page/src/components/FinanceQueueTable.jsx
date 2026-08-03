import { Fragment, useState } from "react";
import StatusBadge from "./StatusBadge";
import { formatUsd, formatCategory, formatStatus, statusTone, riskTone } from "../utils/format";
import { getEffectiveStatus } from "../utils/financeActions";

export default function FinanceQueueTable({
  claims,
  employees,
  financeActions,
  currentUser,
  onStatusChange,
  onAddComment,
  onTogglePaymentHold,
}) {
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  const [commentOpenReceiptId, setCommentOpenReceiptId] = useState(null);
  const [commentDraft, setCommentDraft] = useState("");

  function handleDuplicateClick(e, receiptId) {
    e.stopPropagation();
    const target = claims.find((c) => c.receipt_id === receiptId);
    if (!target) return;
    setSelectedReceiptId(target.receipt_id);
    document
      .getElementById(`finance-row-${target.receipt_id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function toggleComment(receiptId) {
    setCommentOpenReceiptId((current) => (current === receiptId ? null : receiptId));
    setCommentDraft("");
  }

  function handleSubmitComment(e, receiptId) {
    e.preventDefault();
    const trimmed = commentDraft.trim();
    if (!trimmed) return;

    onAddComment(receiptId, {
      text: trimmed,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
    });
    setCommentDraft("");
  }

  if (claims.length === 0) {
    return (
      <div className="card claims-table-card">
        <p className="claims-empty">No claims are currently in the finance queue.</p>
      </div>
    );
  }

  return (
    <div className="card claims-table-card">
      <table className="claims-table">
        <thead>
          <tr>
            <th>Claimant</th>
            <th>Vendor</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Risk</th>
            <th>Confidence</th>
            <th>Policy</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Duplicate</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => {
            const effectiveStatus = getEffectiveStatus(c, financeActions);
            const comments = financeActions[c.receipt_id]?.comments ?? [];
            const paymentHeld = financeActions[c.receipt_id]?.paymentHeld === true;
            const employee = employees.find((e) => e.employee_id === c.employee_id);
            return (
              <Fragment key={c.receipt_id}>
                <tr
                  id={`finance-row-${c.receipt_id}`}
                  className={c.receipt_id === selectedReceiptId ? "row-selected" : ""}
                >
                  <td>
                    <div className="claimant-cell">
                      <span className="claimant-name">{c.employee_name}</span>
                      {employee?.email && <span className="claimant-email">{employee.email}</span>}
                      <span className="claimant-meta">
                        {c.employee_id}
                        {employee?.department && ` · ${employee.department}`}
                        {employee?.role && ` · ${employee.role}`}
                      </span>
                    </div>
                  </td>
                  <td>{c.vendor}</td>
                  <td>{formatCategory(c.category)}</td>
                  <td>{formatUsd(c.amount_usd)}</td>
                  <td>
                    <StatusBadge tone={riskTone(c.risk_score)}>{c.risk_score}</StatusBadge>
                  </td>
                  <td>{Math.round(c.confidence_score * 100)}%</td>
                  <td>
                    <StatusBadge tone={c.decision === "compliant" ? "success" : "warning"}>
                      {c.decision === "compliant" ? "Compliant" : "Flagged"}
                    </StatusBadge>
                  </td>
                  <td>
                    <StatusBadge tone={statusTone(effectiveStatus)}>
                      {formatStatus(effectiveStatus)}
                    </StatusBadge>
                  </td>
                  <td>
                    <StatusBadge tone={paymentHeld ? "danger" : "neutral"}>
                      {paymentHeld ? "Held" : "Not Held"}
                    </StatusBadge>
                  </td>
                  <td>
                    {c.is_duplicate ? (
                      c.duplicate_of.map((dupId) => (
                        <button
                          key={dupId}
                          type="button"
                          className="badge badge-danger duplicate-badge-btn"
                          onClick={(e) => handleDuplicateClick(e, dupId)}
                        >
                          Duplicate of {dupId}
                        </button>
                      ))
                    ) : (
                      <span className="badge badge-neutral">None</span>
                    )}
                  </td>
                  <td>
                    <div className="finance-row-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => onStatusChange(c.receipt_id, "auto_approved")}
                      >
                        Verify/Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onStatusChange(c.receipt_id, "rejected")}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => toggleComment(c.receipt_id)}
                      >
                        Comment{comments.length > 0 ? ` (${comments.length})` : ""}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onTogglePaymentHold(c.receipt_id, !paymentHeld)}
                      >
                        {paymentHeld ? "Release Payment" : "Hold Payment"}
                      </button>
                    </div>
                  </td>
                </tr>
                {commentOpenReceiptId === c.receipt_id && (
                  <tr>
                    <td colSpan={11} className="finance-comment-cell">
                      {comments.length > 0 && (
                        <ul className="activity-list">
                          {comments.map((cm, i) => (
                            <li key={i} className="activity-item">
                              <span className="activity-dot" />
                              <div className="activity-body">
                                <div className="activity-top">
                                  <strong>{cm.author}</strong>
                                </div>
                                <span className="activity-meta">
                                  {new Date(cm.timestamp).toLocaleString()}
                                </span>
                                <p>{cm.text}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      <form className="auth-form" onSubmit={(e) => handleSubmitComment(e, c.receipt_id)}>
                        <label>
                          Add a comment
                          <textarea
                            rows={2}
                            value={commentDraft}
                            onChange={(e) => setCommentDraft(e.target.value)}
                            placeholder="Add an internal comment..."
                          />
                        </label>
                        <button
                          type="submit"
                          className="btn btn-ghost btn-sm"
                          disabled={!commentDraft.trim()}
                        >
                          Add Comment
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
