import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineXMark } from "react-icons/hi2";

export default function ReportIssueModal({ open, onClose, user, employees }) {
  const [message, setMessage] = useState("");

  const manager = employees.find((e) => e.employee_id === user?.manager_id);

  function handleClose() {
    setMessage("");
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim() || !manager) return;

    const subject = `Issue reported by ${user.name} (${user.employee_id})`;
    const mailtoUrl = `mailto:${manager.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(message.trim())}`;
    window.location.href = mailtoUrl;

    handleClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
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
              <h3>Report an Issue</h3>
              <button type="button" className="chat-icon-btn" onClick={handleClose} aria-label="Close">
                <HiOutlineXMark size={18} />
              </button>
            </div>

            {manager ? (
              <>
                <p className="modal-sub">
                  This opens an email to your reporting manager, {manager.name} ({manager.email}).
                </p>
                <form className="auth-form" onSubmit={handleSubmit}>
                  <label>
                    Message
                    <textarea
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the issue you'd like to report..."
                    />
                  </label>
                  <button
                    type="submit"
                    className="btn btn-primary auth-submit"
                    disabled={!message.trim()}
                  >
                    Submit
                  </button>
                </form>
              </>
            ) : (
              <p className="modal-sub">
                We couldn't find a reporting manager on file for your account, so there's no one to
                route this to automatically. Please reach out to HR directly instead.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
