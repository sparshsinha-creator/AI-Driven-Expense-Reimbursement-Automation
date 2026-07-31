import {
  HiOutlineBell,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineExclamationTriangle,
} from "react-icons/hi2";

function buildNotification(c) {
  if (c.is_duplicate) {
    return {
      icon: <HiOutlineExclamationTriangle size={18} />,
      tone: "warning",
      message: `Your ${c.vendor} claim (${c.receipt_id}) was flagged as a possible duplicate.`,
    };
  }
  if (c.routed_status === "rejected") {
    return {
      icon: <HiOutlineXCircle size={18} />,
      tone: "danger",
      message: `Your ${c.vendor} claim (${c.receipt_id}) was rejected.`,
    };
  }
  if (c.routed_status === "auto_approved") {
    return {
      icon: <HiOutlineCheckCircle size={18} />,
      tone: "success",
      message: `Your ${c.vendor} claim (${c.receipt_id}) was auto-approved.`,
    };
  }
  if (c.routed_status === "processing") {
    return {
      icon: <HiOutlineClock size={18} />,
      tone: "neutral",
      message: `Your ${c.vendor} claim (${c.receipt_id}) is being processed.`,
    };
  }
  return {
    icon: <HiOutlineClock size={18} />,
    tone: "warning",
    message: `Your ${c.vendor} claim (${c.receipt_id}) is waiting on ${c.approver_name ?? "an approver"}.`,
  };
}

export default function NotificationsPanel({ claims }) {
  const items = claims.slice(0, 6).map((c) => ({ id: c.receipt_id, ...buildNotification(c) }));

  return (
    <div className="card notifications-panel">
      <div className="panel-header">
        <HiOutlineBell size={18} />
        <h3>Notifications</h3>
      </div>
      {items.length === 0 ? (
        <p className="claims-empty">No notifications yet - upload a receipt to get started.</p>
      ) : (
        <ul className="notifications-list">
          {items.map((item) => (
            <li key={item.id} className="notification-item">
              <span className={`notification-icon tone-${item.tone}`}>{item.icon}</span>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
