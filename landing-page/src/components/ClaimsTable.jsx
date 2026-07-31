import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { formatUsd, formatStatus, statusTone, riskTone } from "../utils/format";

export default function ClaimsTable({ claims }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="card claims-table-card">
      <table className="claims-table">
        <thead>
          <tr>
            <th>Claim</th>
            <th>Employee</th>
            <th>Vendor</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Risk</th>
            <th>Status</th>
            <th>Approver</th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr
              key={c.receipt_id}
              onClick={() => setSelected(c)}
              className={selected?.receipt_id === c.receipt_id ? "row-selected" : ""}
            >
              <td className="mono">{c.receipt_id}</td>
              <td>{c.employee_name}</td>
              <td>{c.vendor}</td>
              <td>{c.category}</td>
              <td>{formatUsd(c.amount_usd)}</td>
              <td>
                <StatusBadge tone={riskTone(c.risk_score)}>{c.risk_score}</StatusBadge>
              </td>
              <td>
                <StatusBadge tone={statusTone(c.routed_status)}>
                  {formatStatus(c.routed_status)}
                </StatusBadge>
              </td>
              <td>{c.approver_name ?? "Unresolved"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className="claim-detail">
          <div className="claim-detail-header">
            <strong>{selected.receipt_id}</strong>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p>{selected.summary}</p>
        </div>
      )}
    </div>
  );
}
