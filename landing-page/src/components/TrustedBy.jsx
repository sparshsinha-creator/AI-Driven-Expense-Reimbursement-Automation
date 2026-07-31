import {
  HiOutlineCpuChip,
  HiOutlineHeart,
  HiOutlineBanknotes,
  HiOutlineShoppingBag,
  HiOutlineCog6Tooth,
  HiOutlineAcademicCap,
  HiOutlineTruck,
  HiOutlineCurrencyDollar,
} from "react-icons/hi2";

// Industry placeholders, not real customer logos - this project has no
// actual customers to name yet.
const INDUSTRIES = [
  { name: "Technology", icon: <HiOutlineCpuChip size={20} /> },
  { name: "Healthcare", icon: <HiOutlineHeart size={20} /> },
  { name: "Banking", icon: <HiOutlineBanknotes size={20} /> },
  { name: "Retail", icon: <HiOutlineShoppingBag size={20} /> },
  { name: "Manufacturing", icon: <HiOutlineCog6Tooth size={20} /> },
  { name: "Education", icon: <HiOutlineAcademicCap size={20} /> },
  { name: "Logistics", icon: <HiOutlineTruck size={20} /> },
  { name: "Finance", icon: <HiOutlineCurrencyDollar size={20} /> },
];

export default function TrustedBy() {
  const track = [...INDUSTRIES, ...INDUSTRIES];

  return (
    <section className="trusted-by">
      <div className="container">
        <p className="trusted-by-label">Built for teams across every industry</p>
      </div>
      <div className="marquee">
        <div className="marquee-track">
          {track.map((item, i) => (
            <div className="marquee-item" key={`${item.name}-${i}`}>
              {item.icon}
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
