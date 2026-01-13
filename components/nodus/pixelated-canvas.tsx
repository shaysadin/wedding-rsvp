"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";

interface PixelatedCanvasProps {
  isActive: boolean;
  className?: string;
  size?: number;
  duration?: number;
  fillColor?: string;
  backgroundColor?: string;
}

export const PixelatedCanvas: React.FC<PixelatedCanvasProps> = ({
  isActive,
  className = "",
  size = 4,
  duration = 2500,
  fillColor = "var(--color-brand, #f17463)",
  backgroundColor = "var(--color-gray-200, white)",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    if (width === 0 || height === 0) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolve CSS colors once
    const resolveColor = (color: string): string => {
      const div = document.createElement("div");
      div.style.color = color;
      document.body.appendChild(div);
      const computedColor = getComputedStyle(div).color;
      document.body.removeChild(div);
      return computedColor;
    };

    const resolvedFillColor = resolveColor(fillColor);
    const resolvedBgColor = resolveColor(backgroundColor);

    // Clear canvas with background
    ctx.fillStyle = resolvedBgColor;
    ctx.fillRect(0, 0, width, height);

    if (!isActive) return;

    // Calculate grid
    const cols = Math.floor(width / size);
    const rows = Math.floor(height / size);
    const totalSquares = cols * rows;

    if (totalSquares === 0) return;

    // Create shuffled array of square indices
    const shuffledSquares: number[] = [];
    for (let i = 0; i < totalSquares; i++) {
      shuffledSquares.push(i);
    }
    // Fisher-Yates shuffle
    for (let i = shuffledSquares.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSquares[i], shuffledSquares[j]] = [shuffledSquares[j], shuffledSquares[i]];
    }

    // Animation state
    let lastDrawnIndex = 0;
    let animationId: number;
    const startTime = performance.now();

    ctx.fillStyle = resolvedFillColor;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const targetIndex = Math.floor(progress * shuffledSquares.length);

      // Only draw NEW squares since last frame (incremental drawing)
      for (let i = lastDrawnIndex; i < targetIndex; i++) {
        const squareIndex = shuffledSquares[i];
        const col = squareIndex % cols;
        const row = Math.floor(squareIndex / cols);
        const x = col * size;
        const y = row * size;
        ctx.fillRect(x, y, size, size);
      }
      lastDrawnIndex = targetIndex;

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isActive, size, duration, fillColor, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full", className)}
      style={{ imageRendering: "pixelated" }}
    />
  );
};
