import { motion } from "framer-motion";

export default function FeatureCard({ icon, title, description, tagsLabel, tags, outro }) {
  return (
    <motion.div
      className="card feature-card"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -6 }}
    >
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}

      {tags && tags.length > 0 && (
        <div className="feature-tags-block">
          {tagsLabel && <span className="feature-tags-label">{tagsLabel}</span>}
          <ul className="feature-tags">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        </div>
      )}

      {outro && <p className="feature-outro">{outro}</p>}
    </motion.div>
  );
}
