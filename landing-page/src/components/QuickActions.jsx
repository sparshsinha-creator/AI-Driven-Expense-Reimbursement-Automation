import { useNavigate } from "react-router-dom";
import {
  HiOutlineDocumentArrowUp,
  HiOutlineMagnifyingGlassCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentList,
  HiOutlineChartBar,
} from "react-icons/hi2";

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export default function QuickActions({ onOpenPolicy }) {
  const navigate = useNavigate();

  const actions = [
    {
      key: "upload",
      label: "Upload Receipt",
      icon: <HiOutlineDocumentArrowUp size={24} />,
      onClick: () => navigate("/upload-receipt"),
    },
    {
      key: "track",
      label: "Track Claim",
      icon: <HiOutlineMagnifyingGlassCircle size={24} />,
      onClick: () => scrollToId("recent-claims"),
    },
    {
      key: "assistant",
      label: "AI Assistant",
      icon: <HiOutlineChatBubbleLeftRight size={24} />,
      onClick: () => window.dispatchEvent(new Event("open-chat-assistant")),
    },
    {
      key: "policy",
      label: "Expense Policy",
      icon: <HiOutlineClipboardDocumentList size={24} />,
      onClick: onOpenPolicy,
    },
    {
      key: "analytics",
      label: "Analytics",
      icon: <HiOutlineChartBar size={24} />,
      onClick: () => scrollToId("analytics-charts"),
    },
  ];

  return (
    <div className="quick-actions-grid">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className="card quick-action-card"
          onClick={action.onClick}
        >
          <span className="quick-action-icon">{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
