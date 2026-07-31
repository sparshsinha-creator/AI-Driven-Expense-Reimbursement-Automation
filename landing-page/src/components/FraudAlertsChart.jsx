import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = {
  Duplicate: "var(--color-danger)",
  Outlier: "var(--color-warning)",
  Clean: "var(--color-success)",
};

export default function FraudAlertsChart({ claims }) {
  const duplicates = claims.filter((c) => c.is_duplicate).length;
  const outliers = claims.filter((c) => c.is_outlier && !c.is_duplicate).length;
  const clean = claims.length - duplicates - outliers;

  const data = [
    { name: "Duplicate", count: duplicates },
    { name: "Outlier", count: outliers },
    { name: "Clean", count: clean },
  ].filter((d) => d.count > 0);

  return (
    <div className="card chart-card">
      <h3>Fraud &amp; anomaly alerts</h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] ?? "var(--color-neutral)"} />
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
