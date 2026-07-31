import {
  HiOutlineBolt,
  HiOutlineClipboardDocumentCheck,
  HiOutlineShieldExclamation,
  HiOutlineCheckBadge,
  HiOutlineEye,
} from "react-icons/hi2";
import { BUSINESS_IMPACT } from "../data/businessImpact";
import KpiCard from "./KpiCard";

const ICONS = {
  "faster-processing": <HiOutlineBolt size={26} />,
  "manual-verification": <HiOutlineClipboardDocumentCheck size={26} />,
  "fraudulent-claims": <HiOutlineShieldExclamation size={26} />,
  "policy-compliance": <HiOutlineCheckBadge size={26} />,
  "real-time-visibility": <HiOutlineEye size={26} />,
};

export default function BusinessImpact() {
  return (
    <section className="business-impact">
      <div className="container">
        <h2 className="section-title">Measurable business impact</h2>
        <p className="section-sub">
          Targets this pipeline's architecture is designed to hit at production scale.
        </p>
        <div className="kpi-grid">
          {BUSINESS_IMPACT.map((item, i) => (
            <KpiCard
              key={item.key}
              target={item.target}
              label={item.label}
              icon={ICONS[item.key]}
              delay={i * 0.06}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
