"use client";

import React, { useState, useEffect, useRef } from "react";
import { Container } from "@/components/nodus/container";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { logos } from "@/components/nodus/constants/logos";
import { useTranslations } from "next-intl";

export const LogoCloud = () => {
  const t = useTranslations("Marketing.logoCloud");

  // Track which logos are currently displayed (indices)
  const [displayedIndices, setDisplayedIndices] = useState<number[]>(() =>
    Array.from({ length: 8 }, (_, i) => i),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedIndices((prev) => {
        const notDisplayedIndices = logos
          .map((_, index) => index)
          .filter((index) => !prev.includes(index));

        if (notDisplayedIndices.length === 0) return prev;

        const positionToReplace = Math.floor(Math.random() * prev.length);
        const randomNotDisplayedIndex = Math.floor(
          Math.random() * notDisplayedIndices.length,
        );
        const newLogoIndex = notDisplayedIndices[randomNotDisplayedIndex];

        const newIndices = [...prev];
        newIndices[positionToReplace] = newLogoIndex;
        return newIndices;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []); // Empty deps - interval runs once and uses functional setState

  return (
    <Container className="border-divide border-x">
      <h2 className="py-8 text-center font-mono text-sm tracking-tight text-neutral-500 uppercase dark:text-gray-300">
        {t("title")}
      </h2>
      <div className="border-divide grid grid-cols-2 border-t md:grid-cols-4">
        {displayedIndices.map((logoIndex, position) => {
          const logo = logos[logoIndex];

          return (
            <div
              key={position}
              className={cn(
                "border-divide group relative overflow-hidden",
                "border-r md:border-r-0",
                position % 2 === 0 ? "border-r" : "",
                position < 6 ? "border-b md:border-b-0" : "",
                "md:border-r-0",
                position % 4 !== 3 ? "md:border-r" : "",
                position < 4 ? "md:border-b" : "",
              )}
            >
              <div className="animate-move-left-to-right bg-brand/5 absolute inset-x-0 bottom-0 h-full translate-y-full transition-all duration-200 group-hover:translate-y-0"></div>
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={logoIndex}
                  className="group flex min-h-32 items-center justify-center p-4 py-10 grayscale"
                  initial={{
                    y: 100,
                    opacity: 0,
                  }}
                  animate={{
                    y: 0,
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: -100,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                  }}
                  whileHover={{
                    opacity: 1,
                  }}
                >
                  <motion.img
                    src={logo.src}
                    alt={logo.title}
                    className={cn(
                      "h-8 w-auto object-contain transition-all duration-500 dark:invert dark:filter",
                      logo.className,
                    )}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Container>
  );
};
