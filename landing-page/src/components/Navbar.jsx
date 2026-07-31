import { Link, NavLink } from "react-router-dom";
import { HiOutlineShieldCheck } from "react-icons/hi2";

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <HiOutlineShieldCheck size={22} />
          <span>ClaimPilot AI</span>
        </Link>

        <nav className="navbar-links">
          <button className="navbar-link" onClick={() => scrollToSection("security")}>
            Security
          </button>
          <button className="navbar-link" onClick={() => scrollToSection("integrations")}>
            Integrations
          </button>
          <button className="navbar-link" onClick={() => scrollToSection("faq")}>
            FAQ
          </button>
          <button className="navbar-link" onClick={() => scrollToSection("contact")}>
            Contact
          </button>
          <NavLink to="/live-demo" className="navbar-link">
            Live Demo
          </NavLink>
        </nav>

        <div className="navbar-actions">
          <Link to="/login" className="btn btn-ghost">
            Log in
          </Link>
          <Link to="/register" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
