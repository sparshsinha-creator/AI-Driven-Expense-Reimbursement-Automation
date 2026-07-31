import { HiOutlineBuildingOffice2, HiOutlineTruck, HiOutlinePaperAirplane } from "react-icons/hi2";

// Illustrative partner offers for this demo - not live inventory or real
// partnerships. The lodging offer references the actual high-cost cities
// from data/policy_rulebook.json rather than an invented list.
const OFFERS = [
  {
    key: "hotel",
    title: "Preferred hotel rates",
    subtitle: "Partner pricing in New York, London, Tokyo, and Dubai",
    icon: <HiOutlineBuildingOffice2 size={24} />,
  },
  {
    key: "transport",
    title: "Airport transfer credit",
    subtitle: "Discounted ground transport for upcoming business travel",
    icon: <HiOutlineTruck size={24} />,
  },
  {
    key: "airfare",
    title: "Corporate airfare discount",
    subtitle: "Reduced economy fares when booked 14+ days in advance",
    icon: <HiOutlinePaperAirplane size={24} />,
  },
];

export default function PromoCards() {
  return (
    <div className="card promo-panel">
      <div className="panel-header">
        <h3>Travel Coupons &amp; Hotel Offers</h3>
      </div>
      <p className="promo-disclaimer">Illustrative partner offers for this demo - not live inventory.</p>
      <div className="promo-grid">
        {OFFERS.map((offer) => (
          <div className="promo-card" key={offer.key}>
            <div className="promo-icon">{offer.icon}</div>
            <div className="promo-body">
              <h4>{offer.title}</h4>
              <p>{offer.subtitle}</p>
            </div>
            <span className="badge badge-neutral">Promotional</span>
          </div>
        ))}
      </div>
    </div>
  );
}
