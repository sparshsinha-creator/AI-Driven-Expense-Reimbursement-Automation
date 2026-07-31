import { Link } from "react-router-dom";
import { FaXTwitter, FaLinkedin, FaGithub } from "react-icons/fa6";

// Sitemap links with an href of "#" are placeholders - those pages don't
// exist in this demo. Only in-app anchors (#faq, #security, etc.) and real
// routes (/dashboard) actually navigate anywhere. The social icons below are
// the same: "#" placeholders, not real profiles.
const FOOTER_COLUMNS = [
  {
    title: "Products",
    links: [
      { label: "Receipt Extraction", href: "#how-it-works" },
      { label: "Policy Validation", href: "#security" },
      { label: "Fraud Detection", href: "#" },
      { label: "Analytics", href: "/dashboard" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Finance Teams", href: "#" },
      { label: "HR Teams", href: "#" },
      { label: "Enterprises", href: "#integrations" },
      { label: "Startups", href: "#" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Contact Sales", href: "#contact" },
      { label: "Documentation", href: "#" },
      { label: "Status", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Privacy Policy", href: "#" },
    ],
  },
];

function FooterLink({ label, href }) {
  if (href.startsWith("/")) {
    return <Link to={href}>{label}</Link>;
  }
  return <a href={href}>{label}</a>;
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-columns">
        <div className="footer-brand">
          <span className="footer-brand-text">ClaimPilot AI</span>
          <p className="footer-muted">
            Built on a real AI-driven expense reimbursement automation pipeline.
          </p>
          <div className="footer-socials">
            <a href="#" aria-label="X (Twitter)">
              <FaXTwitter size={18} />
            </a>
            <a href="#" aria-label="LinkedIn">
              <FaLinkedin size={18} />
            </a>
            <a href="#" aria-label="GitHub">
              <FaGithub size={18} />
            </a>
          </div>
        </div>

        {FOOTER_COLUMNS.map((col) => (
          <div className="footer-column" key={col.title}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map((link) => (
                <li key={link.label}>
                  <FooterLink {...link} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} ClaimPilot AI. All rights reserved.</span>
      </div>
    </footer>
  );
}
