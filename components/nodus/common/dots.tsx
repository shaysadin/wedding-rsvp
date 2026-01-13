"use client";

import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";

export const Dot = ({
  top,
  left,
  right,
  bottom,
}: {
  top?: boolean;
  left?: boolean;
  right?: boolean;
  bottom?: boolean;
}) => {
  const [isNearMouse, setIsNearMouse] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const isNearMouseRef = useRef(false);

  const checkDistance = useCallback((clientX: number, clientY: number) => {
    if (dotRef.current) {
      const dotRect = dotRef.current.getBoundingClientRect();
      const dotCenterX = dotRect.left + dotRect.width / 2;
      const dotCenterY = dotRect.top + dotRect.height / 2;

      const distance = Math.sqrt(
        Math.pow(clientX - dotCenterX, 2) +
          Math.pow(clientY - dotCenterY, 2),
      );

      const newIsNear = distance <= 100;
      // Only update state if the value actually changed
      if (newIsNear !== isNearMouseRef.current) {
        isNearMouseRef.current = newIsNear;
        setIsNearMouse(newIsNear);
      }
    }
  }, []);

  useEffect(() => {
    let rafId: number;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;

      // Use requestAnimationFrame to throttle updates
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          checkDistance(lastX, lastY);
          rafId = 0;
        });
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [checkDistance]);

  return (
    <motion.div
      ref={dotRef}
      className={cn(
        "absolute z-10 h-2 w-2",
        top && "top-0 xl:-top-1",
        left && "left-0 xl:-left-2",
        right && "right-0 xl:-right-2",
        bottom && "bottom-0 xl:-bottom-1",
      )}
      animate={{
        backgroundColor: isNearMouse
          ? "var(--color-brand)"
          : "var(--color-primary)",
        boxShadow: isNearMouse
          ? "0 0 20px var(--color-brand), 0 0 40px var(--color-brand)"
          : "none",
        scale: isNearMouse ? 1.5 : 1,
        borderRadius: isNearMouse ? "50%" : "0%",
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
    />
  );
};
