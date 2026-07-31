import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineChevronDown } from "react-icons/hi2";
import { FAQ_ITEMS } from "../data/faq";

export default function FaqAccordion() {
  const [openKeys, setOpenKeys] = useState(() => new Set([FAQ_ITEMS[0].key]));

  function toggle(key) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="faq-list">
      {FAQ_ITEMS.map((item, i) => {
        const open = openKeys.has(item.key);
        return (
          <motion.div
            key={item.key}
            className={`card faq-item${open ? " faq-item-open" : ""}`}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
          >
            <button className="faq-question" onClick={() => toggle(item.key)} aria-expanded={open}>
              <span>{item.question}</span>
              <HiOutlineChevronDown className="faq-chevron" size={20} />
            </button>
            <div className="faq-answer-wrapper">
              <div className="faq-answer-inner">
                <p>{item.answer}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
