import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HiOutlineIdentification,
  HiOutlineEnvelope,
  HiOutlineBuildingOffice2,
} from "react-icons/hi2";
import { useEmployees } from "../hooks/useEmployees";
import { getDemoUsers } from "../utils/demoUsers";
import { setCurrentUser } from "../utils/session";

export default function Login() {
  const navigate = useNavigate();
  const employees = useEmployees();
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  // Demo-only identity check, not real authentication: no password, no
  // token, no server round-trip. It just confirms the Employee ID and email
  // match a record in the real roster (or a session-registered demo user).
  function handleSubmit(e) {
    e.preventDefault();

    const trimmedId = employeeId.trim();
    const trimmedEmail = email.trim();

    const directory = [...employees, ...getDemoUsers()];
    const match = directory.find(
      (emp) => emp.employee_id.toLowerCase() === trimmedId.toLowerCase()
    );

    if (!match) {
      setError("We couldn't find that Employee ID in the Meridian Corp directory.");
      return;
    }

    if (match.email !== trimmedEmail) {
      setError("That email doesn't match the official email on file for this Employee ID.");
      return;
    }

    setError("");
    setCurrentUser(match);
    navigate("/dashboard");
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
          <div className="auth-brand">
            <HiOutlineBuildingOffice2 size={28} />
          </div>
          <h1>Welcome back</h1>
          <p className="section-sub">Sign in with your Meridian Corp employee credentials.</p>

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
                  placeholder="E001"
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
                  placeholder="you@meridiancorp.com"
                />
              </div>
            </label>

            {error && <p className="auth-error">{error}</p>}

            <div className="auth-actions-row">
              <button type="submit" className="btn btn-primary auth-submit">
                Log in
              </button>
              <Link to="/register" className="btn btn-ghost auth-submit">
                Register
              </Link>
            </div>
          </form>

          <p className="auth-note">
            Demo mode - your Employee ID and email are checked against the real
            employee directory (or a demo account registered this session), but
            there's no password and no live session backend.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
