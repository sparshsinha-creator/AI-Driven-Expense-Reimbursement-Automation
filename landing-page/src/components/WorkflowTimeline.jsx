import { motion } from "framer-motion";
import {
  HiOutlineUser,
  HiOutlineDocumentArrowUp,
  HiOutlineDocumentMagnifyingGlass,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineXCircle,
  HiOutlineCheckCircle,
  HiOutlineUserGroup,
  HiOutlineBanknotes,
  HiOutlineCurrencyDollar,
} from "react-icons/hi2";
import { WORKFLOW_STEPS, WORKFLOW_BRANCHES } from "../data/workflow";

const STEP_ICONS = {
  employee: <HiOutlineUser size={22} />,
  "receipt-upload": <HiOutlineDocumentArrowUp size={22} />,
  "ai-extraction": <HiOutlineDocumentMagnifyingGlass size={22} />,
  "policy-validation": <HiOutlineShieldCheck size={22} />,
  "anomaly-check": <HiOutlineExclamationTriangle size={22} />,
  "workflow-routing": <HiOutlineArrowPath size={22} />,
};

const BRANCH_ICONS = {
  rejected: <HiOutlineXCircle size={22} />,
  "auto-approved": <HiOutlineCheckCircle size={22} />,
  "manager-approval": <HiOutlineUserGroup size={22} />,
  "finance-review": <HiOutlineBanknotes size={22} />,
};

export default function WorkflowTimeline() {
  return (
    <div className="workflow-timeline">
      <div className="workflow-linear">
        {WORKFLOW_STEPS.map((step, i) => (
          <motion.div
            key={step.key}
            className="workflow-step"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <div className="workflow-step-icon">{STEP_ICONS[step.key]}</div>
            <div className="card workflow-step-body">
              {step.phase && <span className="workflow-phase-tag">{step.phase}</span>}
              <h4>{step.label}</h4>
              <p>{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="workflow-fan-connector" aria-hidden="true" />
      <p className="workflow-branch-label">Routes to one of four outcomes:</p>

      <div className="workflow-branches">
        {WORKFLOW_BRANCHES.map((branch, i) => (
          <motion.div
            key={branch.key}
            className={`card workflow-branch-card tone-${branch.tone}`}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <div className="workflow-branch-icon">{BRANCH_ICONS[branch.key]}</div>
            <h4>{branch.label}</h4>
            {branch.outcome === "stop" ? (
              <span className="badge badge-danger">Stop &mdash; no reimbursement</span>
            ) : (
              <span className="badge badge-success">&rarr; Reimbursement</span>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        className="card workflow-final-card"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="workflow-final-icon">
          <HiOutlineCurrencyDollar size={26} />
        </div>
        <div>
          <h4>Reimbursement</h4>
          <p>Funds are disbursed to the employee once a signed authorization clears.</p>
        </div>
      </motion.div>
    </div>
  );
}
