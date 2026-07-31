import { motion } from "framer-motion";
import { useCountUp } from "../hooks/useCountUp";

export default function KpiCard({ target, suffix = "%", label, icon, delay = 0 }) {
  const { ref, value } = useCountUp(target);
  return (
    <motion.div
      ref={ref}
      className="card kpi-card"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-value">
        {value}
        {suffix}
      </div>
      <div className="kpi-label">{label}</div>
    </motion.div>
  );
}
