import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { HiOutlineUserCircle, HiOutlineArrowLeftOnRectangle } from "react-icons/hi2";
import { clearCurrentUser } from "../utils/session";

export default function ProfileCard({ user }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearCurrentUser();
    navigate("/");
  }

  return (
    <motion.div
      className="card profile-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
    >
      <div className="profile-avatar">
        <HiOutlineUserCircle size={40} />
      </div>
      <h3>{user.name}</h3>
      <p className="profile-role">{user.role || user.designation || "Employee"}</p>
      <div className="profile-details">
        <div className="welcome-meta-item">
          <span className="welcome-meta-label">Email</span>
          <span>{user.email}</span>
        </div>
        {user.location && (
          <div className="welcome-meta-item">
            <span className="welcome-meta-label">Location</span>
            <span>{user.location}</span>
          </div>
        )}
      </div>
      <button type="button" className="btn btn-ghost auth-submit" onClick={handleLogout}>
        <HiOutlineArrowLeftOnRectangle size={18} />
        Log out
      </button>
    </motion.div>
  );
}
