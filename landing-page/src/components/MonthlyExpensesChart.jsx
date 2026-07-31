import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function MonthlyExpensesChart({ claims }) {
  const totalsByMonth = {};
  for (const c of claims) {
    const key = new Date(c.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
    totalsByMonth[key] = (totalsByMonth[key] ?? 0) + c.amount_usd;
  }
  const data = Object.entries(totalsByMonth).map(([month, total]) => ({
    month,
    total: Math.round(total * 100) / 100,
  }));

  return (
    <div className="card chart-card">
      <h3>Monthly expenses</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="month" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
          <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
          <Tooltip
            formatter={(value) => [`$${value.toFixed(2)}`, "Total"]}
            contentStyle={{
              background: "var(--color-surface-alt)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text)",
            }}
          />
          <Bar dataKey="total" fill="var(--color-accent-strong)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
