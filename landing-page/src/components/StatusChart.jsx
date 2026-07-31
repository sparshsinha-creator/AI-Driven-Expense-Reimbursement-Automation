import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatStatus } from "../utils/format";

const COLORS = {
  auto_approved: "var(--color-success)",
  pending_manager_approval: "var(--color-warning)",
  pending_finance_approval: "var(--color-accent)",
  rejected: "var(--color-danger)",
};

export default function StatusChart({ claims }) {
  const counts = {};
  for (const c of claims) {
    counts[c.routed_status] = (counts[c.routed_status] ?? 0) + 1;
  }
  const data = Object.entries(counts).map(([status, count]) => ({
    status,
    name: formatStatus(status),
    count,
  }));

  return (
    <div className="card chart-card">
      <h3>Routing outcomes</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={COLORS[entry.status] ?? "var(--color-neutral)"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-surface-alt)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-text-muted)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
