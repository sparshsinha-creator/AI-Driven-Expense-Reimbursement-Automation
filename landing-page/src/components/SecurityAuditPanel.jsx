import { usePaymentAuthorizations } from "../hooks/usePaymentAuthorizations";
import { useDisbursementLog } from "../hooks/useDisbursementLog";
import { useEmployees } from "../hooks/useEmployees";
import StatusBadge from "./StatusBadge";
import { formatUsd } from "../utils/format";

function truncateSignature(sig) {
  if (!sig) return "—";
  return `${sig.slice(0, 20)}…${sig.slice(-8)}`;
}

function payeeLabel(payee, employees) {
  const employee = employees.find((e) => e.employee_id === payee);
  return employee ? `${payee} (${employee.name})` : payee;
}

export default function SecurityAuditPanel() {
  const paymentAuthorizations = usePaymentAuthorizations();
  const disbursementLog = useDisbursementLog();
  const employees = useEmployees();

  return (
    <div className="card claims-table-card">
      <h3>Security &amp; Audit Trail (Architecture Extension B Demo)</h3>
      <p className="promo-disclaimer">
        Read-only snapshot from a past cryptographic-signing simulation - not a live
        feed of current claims. It predates recent roster changes (e.g. it still
        references E005, since removed) and does not cover the current
        finance-escalated receipts (RCPT-006, 008, 011, 012) shown in the queue above.
      </p>

      <h4>Payment Authorizations</h4>
      <table className="claims-table">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Amount</th>
            <th>Payee</th>
            <th>Approver Identity</th>
            <th>Timestamp</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>
          {paymentAuthorizations.map((auth) => (
            <tr key={auth.payload.transaction_id}>
              <td className="mono">{auth.payload.transaction_id}</td>
              <td>{formatUsd(auth.payload.amount_usd)}</td>
              <td>{payeeLabel(auth.payload.payee, employees)}</td>
              <td>{auth.payload.approver_identity}</td>
              <td>{new Date(auth.payload.timestamp).toLocaleString()}</td>
              <td className="mono" title={auth.signatures.workflow_agent}>
                {truncateSignature(auth.signatures.workflow_agent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4>Disbursement Log</h4>
      <table className="claims-table">
        <thead>
          <tr>
            <th>Transaction ID</th>
            <th>Amount</th>
            <th>Payee</th>
            <th>Executed At</th>
            <th>Status</th>
            <th>Signers</th>
            <th>Signature</th>
          </tr>
        </thead>
        <tbody>
          {disbursementLog.map((entry) => (
            <tr key={entry.transaction_id}>
              <td className="mono">{entry.transaction_id}</td>
              <td>{formatUsd(entry.amount_usd)}</td>
              <td>{payeeLabel(entry.payee, employees)}</td>
              <td>{new Date(entry.executed_at).toLocaleString()}</td>
              <td>
                <StatusBadge tone={entry.status === "executed" ? "success" : "neutral"}>
                  {entry.status}
                </StatusBadge>
              </td>
              <td>{entry.signers.join(", ")}</td>
              <td className="mono" title={entry.signatures[entry.signers[0]]}>
                {truncateSignature(entry.signatures[entry.signers[0]])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
