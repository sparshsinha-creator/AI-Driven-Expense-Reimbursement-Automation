import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function CostCenterChart({ claims, employees }) {
  const costCenterByEmployeeId = Object.fromEntries(
    employees.map((e) => [e.employee_id, e.cost_center])
  );

  const totalsByCostCenter = {};
  for (const c of claims) {
    const costCenter = costCenterByEmployeeId[c.employee_id] ?? "Unknown";
    totalsByCostCenter[costCenter] = (totalsByCostCenter[costCenter] ?? 0) + c.amount_usd;
  }
  const data = Object.entries(totalsByCostCenter).map(([costCenter, total]) => ({
    costCenter,
    total: Math.round(total * 100) / 100,
  }));

  return (
    <div className="card chart-card">
      <h3>Cost center breakdown</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="costCenter" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
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
