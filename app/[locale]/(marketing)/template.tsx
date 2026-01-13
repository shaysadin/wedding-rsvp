"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

interface TemplateProps {
  children: ReactNode;
}

export default function Template({ children }: TemplateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  );
}
