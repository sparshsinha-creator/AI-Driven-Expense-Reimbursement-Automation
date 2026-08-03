import StatusBadge from "./StatusBadge";
import { formatUsd, formatCategory, formatStatus, statusTone, riskTone } from "../utils/format";
import { getEffectiveStatus } from "../utils/managerActions";

export default function ApprovalQueue({ claims, managerActions, selectedReceiptId, onSelect }) {
  const rows = claims.filter((c) => c.approval_action_required);

  function handleDuplicateClick(e, receiptId) {
    e.stopPropagation();
    const target = claims.find((c) => c.receipt_id === receiptId);
    if (target) {
      onSelect(target);
    }
  }

  return (
    <div className="card claims-table-card">
      {rows.length === 0 ? (
        <p className="claims-empty">No claims are currently pending your approval.</p>
      ) : (
        <table className="claims-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Risk</th>
              <th>Confidence</th>
              <th>Policy</th>
              <th>Status</th>
              <th>Duplicate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const effectiveStatus = getEffectiveStatus(c, managerActions);
              return (
                <tr
                  key={c.receipt_id}
                  onClick={() => onSelect(c)}
                  className={c.receipt_id === selectedReceiptId ? "row-selected" : ""}
                >
                  <td>{c.employee_name}</td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
