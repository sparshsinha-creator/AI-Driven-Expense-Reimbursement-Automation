import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function DepartmentSpendingChart({ claims, employees }) {
  const departmentByEmployeeId = Object.fromEntries(
    employees.map((e) => [e.employee_id, e.department])
  );

  const totalsByDepartment = {};
  for (const c of claims) {
    const department = departmentByEmployeeId[c.employee_id] ?? "Unknown";
    totalsByDepartment[department] = (totalsByDepartment[department] ?? 0) + c.amount_usd;
  }
  const data = Object.entries(totalsByDepartment).map(([department, total]) => ({
    department,
    total: Math.round(total * 100) / 100,
  }));

  return (
    <div className="card chart-card">
      <h3>Department spending</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="department" tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} />
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
          <Bar dataKey="total" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
