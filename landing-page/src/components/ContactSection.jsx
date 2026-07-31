import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HiOutlineEnvelope, HiOutlineCalendarDays, HiOutlineRocketLaunch } from "react-icons/hi2";

// Contact Sales / Book Demo are real tabs over the one form below - picking
// one only changes the Message placeholder, nothing gets emailed (this demo
// has no backend). Start Free Trial is deliberately NOT part of this tab
// group - it's a plain navigation link to /register, same as the Hero's.
const TABS = {
  sales: {
    label: "Contact Sales",
    icon: <HiOutlineEnvelope size={24} />,
    placeholder: "Tell us about your team's expense process.",
  },
  demo: {
    label: "Book Demo",
    icon: <HiOutlineCalendarDays size={24} />,
    placeholder: "What would you like to see in the demo?",
  },
};

export default function ContactSection() {
  const [activeTab, setActiveTab] = useState("sales");
  const [submitted, setSubmitted] = useState(false);

  // Lets the Hero's "Book Demo" button (or anything else on the page) select
  // this tab and bring it into view, instead of leaving it on the default.
  useEffect(() => {
    function handleSelectBookDemo() {
      setActiveTab("demo");
    }
    window.addEventListener("select-book-demo-tab", handleSelectBookDemo);
    return () => window.removeEventListener("select-book-demo-tab", handleSelectBookDemo);
  }, []);

  // No backend to send this to - just flips to the success state locally.
  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section id="contact" className="contact">
      <div className="container">
        <h2 className="section-title">Ready to get started?</h2>
        <p className="section-sub">Talk to sales, book a walkthrough, or just start a free trial.</p>

        <div className="contact-actions">
          {Object.entries(TABS).map(([key, tab]) => (
            <button
              key={key}
              type="button"
              className={`card contact-action${activeTab === key ? " contact-action-active" : ""}`}
              aria-pressed={activeTab === key}
              onClick={() => setActiveTab(key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
          <Link to="/register" className="card contact-action">
            <HiOutlineRocketLaunch size={24} />
            <span>Start Free Trial</span>
          </Link>
        </div>

        <p className="contact-email-note">
          Prefer email? Reach us directly at{" "}
          <a href="mailto:sparshthought@gmail.com">sparshthought@gmail.com</a>.
        </p>

        <motion.div
          className="card contact-form-card"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {submitted ? (
            <div className="contact-success">
              <h3>Thanks - message received.</h3>
              <p>This is a demo form with no backend wired up yet, so nothing was actually sent.</p>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <label>
                Name
                <input type="text" required placeholder="Jordan Lee" />
              </label>
              <label>
                Work Email
                <input type="email" required placeholder="jordan@company.com" />
              </label>
              <label>
                Company
                <input type="text" placeholder="Acme Inc." />
              </label>
              <label>
                Message
                <textarea rows={4} placeholder={TABS[activeTab].placeholder} />
              </label>
              <button type="submit" className="btn btn-primary auth-submit">
                Send message
              </button>
              <p className="auth-note">Demo mode - this form isn't connected to a backend yet.</p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
