import { motion } from "framer-motion";

// Deterministic pseudo-random layout (not Math.random()) so particles don't
// visibly re-shuffle on every render in StrictMode's double-invoke.
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: 3 + ((i * 7) % 9),
  left: (i * 37) % 100,
  top: (i * 53) % 100,
  duration: 7 + (i % 6),
  delay: (i % 5) * 0.5,
}));

export default function HeroParticles() {
  return (
    <div className="hero-particles" aria-hidden="true">
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          className="hero-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{ y: [0, -26, 0], opacity: [0.15, 0.6, 0.15] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
