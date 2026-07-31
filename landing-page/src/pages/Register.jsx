import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineIdentification,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlineBuildingOffice2,
  HiOutlineBriefcase,
  HiOutlineCheckCircle,
} from "react-icons/hi2";
import { addDemoUser } from "../utils/demoUsers";

// Departments as they actually appear in src/data/employees.json, plus a
// couple of common ones not yet represented in the seed roster.
const DEPARTMENTS = ["Sales", "Engineering", "Marketing", "Executive", "Finance", "Operations"];

const MERIDIAN_EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@meridiancorp\.com$/i;

export default function Register() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();

    if (!employeeId.trim()) {
      setError("Employee ID is required.");
      return;
    }

    if (!MERIDIAN_EMAIL_PATTERN.test(email.trim())) {
      setError("Official email must be a valid @meridiancorp.com address.");
      return;
    }

    setError("");

    // Demo-only: there's no real backend, so this registration is kept in
    // localStorage for this browser/session and never sent anywhere real.
    addDemoUser({
      employee_id: employeeId.trim(),
      name: fullName.trim(),
      email: email.trim(),
      department,
      designation: designation.trim(),
    });

    setSubmitted(true);
    setTimeout(() => navigate("/login"), 1500);
  }

  return (
    <section className="auth-page">
      <div className="container auth-container">
        <motion.div
          className="card auth-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                className="auth-success"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <motion.div
                  className="auth-success-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
                >
                  <HiOutlineCheckCircle size={48} />
                </motion.div>
                <h1>You're all set!</h1>
                <p className="section-sub">Redirecting you to log in&hellip;</p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="auth-brand">
                  <HiOutlineBuildingOffice2 size={28} />
                </div>
                <h1>Create your account</h1>
                <p className="section-sub">Register with your Meridian Corp employee details.</p>

                <form onSubmit={handleSubmit} className="auth-form">
                  <label>
                    Employee ID
                    <div className="input-with-icon">
                      <HiOutlineIdentification size={18} />
                      <input
                        type="text"
                        required
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="E011"
                      />
                    </div>
                  </label>
                  <label>
                    Full Name
                    <div className="input-with-icon">
                      <HiOutlineUser size={18} />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Jordan Lee"
                      />
                    </div>
                  </label>
                  <label>
                    Official Email
                    <div className="input-with-icon">
                      <HiOutlineEnvelope size={18} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jordan.lee@meridiancorp.com"
                      />
                    </div>
                  </label>
                  <label>
                    Department
                    <select
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="" disabled>
                        Select a department
                      </option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Designation
                    <div className="input-with-icon">
                      <HiOutlineBriefcase size={18} />
                      <input
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="Account Executive"
                      />
                    </div>
                  </label>

                  {error && <p className="auth-error">{error}</p>}

                  <button type="submit" className="btn btn-primary auth-submit">
                    Create account
                  </button>
                </form>

                <p className="auth-footer">
                  Already have an account? <Link to="/login">Log in</Link>
                </p>
                <p className="auth-note">
                  Demo mode - registrations aren't sent to a real backend. They're
                  stored in this browser's localStorage for this session only.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
