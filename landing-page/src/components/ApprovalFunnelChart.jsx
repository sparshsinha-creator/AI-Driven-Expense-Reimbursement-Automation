import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from "recharts";
import { formatStatus } from "../utils/format";

const COLORS = {
  auto_approved: "var(--color-success)",
  pending_manager_approval: "var(--color-warning)",
  pending_finance_approval: "var(--color-accent)",
  rejected: "var(--color-danger)",
};

export default function ApprovalFunnelChart({ claims }) {
  const counts = {};
  for (const c of claims) {
    counts[c.routed_status] = (counts[c.routed_status] ?? 0) + 1;
  }
  const data = Object.entries(counts)
    .map(([status, count]) => ({
      status,
      name: formatStatus(status),
      value: count,
      fill: COLORS[status] ?? "var(--color-neutral)",
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="card chart-card">
      <h3>Approval funnel</h3>
      <ResponsiveContainer width="100%" height={260}>
        <FunnelChart>
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-alt)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text)",
            }}
          />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList
              position="center"
              dataKey="name"
              fill="#fff"
              stroke="none"
              fontSize={13}
              fontWeight={600}
            />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
