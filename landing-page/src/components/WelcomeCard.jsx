import { motion } from "framer-motion";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function WelcomeCard({ user }) {
  const firstName = user.name?.split(" ")[0] ?? user.name;

  return (
    <motion.div
      className="card welcome-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <span className="welcome-greeting">
        {getGreeting()}, {firstName}
      </span>
      <h1>Welcome back to ClaimPilot AI</h1>
      <div className="welcome-meta">
        <div className="welcome-meta-item">
          <span className="welcome-meta-label">Employee ID</span>
          <span>{user.employee_id}</span>
        </div>
        <div className="welcome-meta-item">
          <span className="welcome-meta-label">Department</span>
          <span>{user.department || "Unassigned"}</span>
        </div>
      </div>
    </motion.div>
  );
}
