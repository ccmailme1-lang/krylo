// File: src/components/Nooma.jsx
// Location: src/components/

import React from 'react';
import { motion } from 'framer-motion';

export default function Nooma({ items }) {
  return (
    <motion.div
      className="nooma-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {items && items.map((item, idx) => (
        <div key={idx} className="nooma-item">{item}</div>
      ))}
    </motion.div>
  );
}