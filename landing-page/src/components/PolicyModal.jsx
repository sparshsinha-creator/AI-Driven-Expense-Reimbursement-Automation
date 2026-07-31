import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineXMark } from "react-icons/hi2";
import { POLICY_SUMMARY } from "../data/policySummary";

export default function PolicyModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="card modal-panel"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Expense Policy</h3>
              <button type="button" className="chat-icon-btn" onClick={onClose} aria-label="Close">
                <HiOutlineXMark size={18} />
              </button>
            </div>
            <p className="modal-sub">
              The same limits this pipeline's policy engine actually enforces.
            </p>
            <div className="policy-list">
              {POLICY_SUMMARY.map((item) => (
                <div className="policy-row" key={item.rule}>
                  <div className="policy-row-top">
                    <strong>{item.rule}</strong>
                    <span className="badge badge-neutral">{item.limit}</span>
                  </div>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
