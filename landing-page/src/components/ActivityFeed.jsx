import StatusBadge from "./StatusBadge";
import { formatDate, formatStatus, formatUsd, statusTone } from "../utils/format";

export default function ActivityFeed({ claims }) {
  return (
    <div className="card activity-feed">
      <h3>Recent Activity</h3>
      {claims.length === 0 ? (
        <p className="claims-empty">
          Nothing here yet - your claims will show up as soon as you submit one.
        </p>
      ) : (
        <ul className="activity-list">
          {claims.map((c) => (
            <li key={c.receipt_id} className="activity-item">
              <span className="activity-dot" />
              <div className="activity-body">
                <div className="activity-top">
                  <strong>{c.vendor}</strong>
                  <StatusBadge tone={statusTone(c.routed_status)}>
                    {formatStatus(c.routed_status)}
                  </StatusBadge>
                </div>
                <span className="activity-meta">
                  {formatDate(c.date)} &middot; {formatUsd(c.amount_usd)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
