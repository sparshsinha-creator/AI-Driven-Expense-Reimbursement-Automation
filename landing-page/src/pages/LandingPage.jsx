import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HiOutlineDocumentMagnifyingGlass,
  HiOutlineShieldCheck,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineXCircle,
  HiOutlineExclamationTriangle,
  HiOutlineDocumentArrowUp,
  HiOutlineTableCells,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChartBar,
  HiOutlinePlayCircle,
  HiOutlineLockClosed,
  HiOutlineIdentification,
  HiOutlineClipboardDocumentList,
  HiOutlineGlobeAlt,
  HiOutlineDevicePhoneMobile,
  HiOutlineCloud,
  HiOutlineCube,
  HiOutlineCircleStack,
  HiOutlineUserGroup,
  HiOutlineCalculator,
  HiOutlineVideoCamera,
  HiOutlineSquares2X2,
  HiOutlineCurrencyDollar,
} from "react-icons/hi2";
import { useClaims } from "../hooks/useClaims";
import { FEATURES } from "../data/features";
import { SECURITY_FEATURES } from "../data/security";
import { INTEGRATIONS } from "../data/integrations";
import StatCard from "../components/StatCard";
import FeatureCard from "../components/FeatureCard";
import HeroParticles from "../components/HeroParticles";
import HeroStats from "../components/HeroStats";
import TrustedBy from "../components/TrustedBy";
import WorkflowTimeline from "../components/WorkflowTimeline";
import BusinessImpact from "../components/BusinessImpact";
import FaqAccordion from "../components/FaqAccordion";
import ContactSection from "../components/ContactSection";

const FEATURE_ICONS = {
  "ai-receipt-processing": <HiOutlineDocumentArrowUp size={26} />,
  "intelligent-data-extraction": <HiOutlineTableCells size={26} />,
  "smart-policy-validation": <HiOutlineShieldCheck size={26} />,
  "ai-fraud-detection": <HiOutlineExclamationTriangle size={26} />,
  "automated-approval-workflow": <HiOutlineBanknotes size={26} />,
  "ai-expense-assistant": <HiOutlineChatBubbleLeftRight size={26} />,
  "expense-analytics": <HiOutlineChartBar size={26} />,
};

const SECURITY_ICONS = {
  encryption: <HiOutlineLockClosed size={26} />,
  rbac: <HiOutlineIdentification size={26} />,
  "audit-logs": <HiOutlineClipboardDocumentList size={26} />,
  gdpr: <HiOutlineGlobeAlt size={26} />,
  soc2: <HiOutlineShieldCheck size={26} />,
  mfa: <HiOutlineDevicePhoneMobile size={26} />,
  "secure-cloud": <HiOutlineCloud size={26} />,
};

const INTEGRATION_ICONS = {
  sap: <HiOutlineCube size={26} />,
  oracle: <HiOutlineCircleStack size={26} />,
  workday: <HiOutlineUserGroup size={26} />,
  quickbooks: <HiOutlineCalculator size={26} />,
  slack: <HiOutlineChatBubbleLeftRight size={26} />,
  teams: <HiOutlineVideoCamera size={26} />,
  payroll: <HiOutlineBanknotes size={26} />,
  erp: <HiOutlineSquares2X2 size={26} />,
  "finance-systems": <HiOutlineCurrencyDollar size={26} />,
};

// Selects the Book Demo tab in ContactSection (which listens for this event)
// and brings the Contact section into view - Book Demo no longer opens a
// mailto link, it points at the real contact form's Book Demo tab instead.
function goToBookDemo() {
  window.dispatchEvent(new Event("select-book-demo-tab"));
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
}

export default function LandingPage() {
  const claims = useClaims();

  const autoApproved = claims.filter((c) => c.routed_status === "auto_approved").length;
  const pendingReview = claims.filter((c) => c.routed_status.startsWith("pending_")).length;
  const rejected = claims.filter((c) => c.routed_status === "rejected").length;
  const highRisk = claims.filter((c) => c.risk_score === "high").length;

  return (
    <div className="landing">
      {/* Hero */}
      <section className="hero hero-gradient">
        <HeroParticles />
        <div className="container hero-inner">
          <motion.div
            className="card hero-glass-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="eyebrow">AI-driven expense reimbursement automation</span>
            <h1>Transform Expense Reimbursements with AI</h1>
            <p className="hero-sub">
              From receipt upload to reimbursement approval, ClaimPilot AI automates
              every step of the expense management lifecycle using Artificial
              Intelligence.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary">
                Start Free Trial
              </Link>
              <button type="button" className="btn btn-secondary" onClick={goToBookDemo}>
                Book Demo
              </button>
              <Link to="/live-demo" className="btn btn-ghost">
                <HiOutlinePlayCircle size={18} />
                Watch Demo
              </Link>
            </div>

            <HeroStats />
          </motion.div>
        </div>
      </section>

      {/* Trusted by */}
      <TrustedBy />

      {/* Real pipeline stats */}
      <section className="stats-strip">
        <div className="container stats-grid">
          <StatCard
            label="Claims processed"
            value={claims.length}
            icon={<HiOutlineDocumentMagnifyingGlass size={22} />}
          />
          <StatCard
            label="Auto-approved"
            value={autoApproved}
            icon={<HiOutlineCheckCircle size={22} />}
          />
          <StatCard
            label="Pending review"
            value={pendingReview}
            icon={<HiOutlineClock size={22} />}
          />
          <StatCard label="Rejected" value={rejected} icon={<HiOutlineXCircle size={22} />} />
          <StatCard
            label="High-risk flags"
            value={highRisk}
            icon={<HiOutlineExclamationTriangle size={22} />}
          />
        </div>
        <p className="container stats-caption">
          Real numbers from this project's own pipeline run &mdash; not illustrative examples.
        </p>
      </section>

      {/* How ClaimPilot AI Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How ClaimPilot AI Works</h2>
          <p className="section-sub">
            The exact pipeline this project runs, from receipt to reimbursement.
          </p>
          <WorkflowTimeline />
        </div>
      </section>

      {/* Seven feature cards */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Everything expense reimbursement needs, automated</h2>
          <p className="section-sub">Seven capabilities working together on every claim.</p>
          <div className="features-grid features-grid-7">
            {FEATURES.map((feature) => (
              <FeatureCard
                key={feature.key}
                icon={FEATURE_ICONS[feature.key]}
                title={feature.title}
                description={feature.description}
                tagsLabel={feature.tagsLabel}
                tags={feature.tags}
                outro={feature.outro}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Business Impact */}
      <BusinessImpact />

      {/* Security - scrollable anchor section */}
      <section id="security" className="security">
        <div className="container">
          <h2 className="section-title">Enterprise-grade security</h2>
          <p className="section-sub">
            Every layer of the stack is designed around encryption, access control, and auditability.
          </p>
          <div className="features-grid features-grid-7">
            {SECURITY_FEATURES.map((item) => (
              <FeatureCard
                key={item.key}
                icon={SECURITY_ICONS[item.key]}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Integrations - scrollable anchor section */}
      <section id="integrations" className="integrations">
        <div className="container">
          <h2 className="section-title">Integrates with what you already have</h2>
          <p className="section-sub">
            Built to connect with the systems finance teams already run on.
          </p>
          <div className="features-grid features-grid-7">
            {INTEGRATIONS.map((item) => (
              <FeatureCard
                key={item.key}
                icon={INTEGRATION_ICONS[item.key]}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq">
        <div className="container">
          <h2 className="section-title">Frequently asked questions</h2>
          <p className="section-sub">
            Straight answers about how claims actually move through the pipeline.
          </p>
          <FaqAccordion />
        </div>
      </section>

      {/* Contact */}
      <ContactSection />

      {/* Final CTA */}
      <section className="cta">
        <div className="container cta-inner">
          <h2>See it work on real claims</h2>
          <p>No sign-up required for the live demo - it's the same 12 claims this pipeline actually processed.</p>
          <Link to="/live-demo" className="btn btn-primary">
            Open the live demo
          </Link>
        </div>
      </section>
    </div>
  );
}
