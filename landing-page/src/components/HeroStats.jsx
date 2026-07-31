import { motion } from "framer-motion";
import {
  HiOutlineBolt,
  HiOutlineDocumentMagnifyingGlass,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { useCountUp } from "../hooks/useCountUp";

function NumericStat({ target, suffix, label, icon }) {
  const { ref, value } = useCountUp(target);
  return (
    <motion.div
      ref={ref}
      className="hero-stat"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="hero-stat-icon">{icon}</div>
      <div className="hero-stat-value">
        {value}
        {suffix}
      </div>
      <div className="hero-stat-label">{label}</div>
    </motion.div>
  );
}

function TextStat({ label, icon, index }) {
  return (
    <motion.div
      className="hero-stat"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <div className="hero-stat-icon">{icon}</div>
      <div className="hero-stat-label hero-stat-label-only">{label}</div>
    </motion.div>
  );
}

export default function HeroStats() {
  return (
    <div className="hero-stats">
      {/* Illustrative target, same figure as data/businessImpact.js - not a
          measured production metric. */}
      <NumericStat
        target={90}
        suffix="%"
        label="Faster Processing"
        icon={<HiOutlineBolt size={20} />}
      />
      <TextStat
        index={0}
        label="AI Receipt Intelligence"
        icon={<HiOutlineDocumentMagnifyingGlass size={20} />}
      />
      <TextStat
        index={1}
        label="Automated Policy Validation"
        icon={<HiOutlineShieldCheck size={20} />}
      />
      <TextStat
        index={2}
        label="Intelligent Fraud Detection"
        icon={<HiOutlineExclamationTriangle size={20} />}
      />
      <TextStat index={3} label="Enterprise Security" icon={<HiOutlineLockClosed size={20} />} />
    </div>
  );
}
