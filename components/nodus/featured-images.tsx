"use client";

import { cn } from "@/lib/utils";
import { motion, useAnimation, type Variants } from "motion/react";
import React, { useEffect } from "react";

const images = [
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1623582854588-d60de57fa33f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1636041293178-808a6762ab39?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8YXZhdGFyfGVufDB8fDB8fHww&auto=format&fit=crop&w=800&q=60",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fGF2YXRhcnxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=800&q=60",
];

const imageVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
    scale: 0.8,
  },
  visible: (idx: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 24,
      delay: idx * 0.08,
    },
  }),
};

export function FeaturedImages({
  className,
  containerClassName,
}: {
  className?: string;
  containerClassName?: string;
}) {
  const controls = useAnimation();

  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  return (
    <div className={cn("flex items-center", containerClassName)}>
      {images.map((image, idx) => (
        <motion.img
          key={`avatar-${idx}`}
          custom={idx}
          initial="hidden"
          animate={controls}
          variants={imageVariants}
          style={{
            willChange: "transform, opacity",
            backfaceVisibility: "hidden",
          }}
          className={cn(
            "h-8 w-8 rounded-full border-2 border-white object-cover shadow-md dark:border-neutral-800 sm:h-10 sm:w-10",
            idx !== 4 && "-ml-3",
            className
          )}
          src={image}
          alt={`Happy user ${idx + 1}`}
        />
      ))}
    </div>
  );
}
