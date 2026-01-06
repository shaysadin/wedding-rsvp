"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageFadeInProps {
  children: ReactNode;
  className?: string;
}

export function PageFadeIn({ children, className }: PageFadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex flex-col px-3 gap-4 lg:gap-6 overflow-y-auto", className)}
    >
      {children}
    </motion.div>
  );
}
