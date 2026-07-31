import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { formatUsd, formatStatus, formatCategory, statusTone } from "../utils/format";

const STATUS_OPTIONS = [
  "auto_approved",
  "pending_manager_approval",
  "pending_finance_approval",
  "rejected",
  "processing",
];

export default function RecentClaimsTable({ claims }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = claims.filter((c) => {
    const matchesStatus = statusFilter === "all" || c.routed_status === statusFilter;
    const matchesSearch = c.vendor.toLowerCase().includes(search.trim().toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="card claims-table-card" id="recent-claims">
      <div className="claims-filter-bar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by vendor..."
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {formatStatus(s)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="claims-empty">
          {claims.length === 0
            ? "No claims yet - upload a receipt to get started."
            : "No claims match your filters."}
        </p>
      ) : (
        <table className="claims-table">
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.receipt_id}
                onClick={() => setSelected(c)}
                className={selected?.receipt_id === c.receipt_id ? "row-selected" : ""}
              >
                <td>{c.vendor}</td>
                <td>{formatCategory(c.category)}</td>
                <td>{formatUsd(c.amount_usd)}</td>
                <td>
                  <StatusBadge tone={statusTone(c.routed_status)}>
                    {formatStatus(c.routed_status)}
                  </StatusBadge>
                </td>
                <td className="claims-summary-cell">
                  {c.summary ?? "Awaiting processing - no summary yet."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="claim-detail">
          <div className="claim-detail-header">
            <strong>{selected.receipt_id}</strong>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p>{selected.summary ?? "Awaiting processing - no summary yet."}</p>
        </div>
      )}
    </div>
  );
}
