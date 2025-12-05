"use client";

import { useState } from "react";
import { Minus, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestCounterProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  isRTL?: boolean;
  // Styling props from settings
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  height?: number;
  accentColor?: string;
  // Button styling
  buttonSize?: number;
  buttonBackground?: string;
  buttonTextColor?: string;
  buttonBorderRadius?: number;
  // Number styling
  numberFontSize?: number;
}

export function GuestCounter({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
  isRTL = false,
  backgroundColor,
  textColor,
  borderColor,
  borderWidth,
  borderRadius,
  padding,
  height,
  accentColor,
  buttonSize,
  buttonBackground,
  buttonTextColor,
  buttonBorderRadius,
  numberFontSize,
}: GuestCounterProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<"up" | "down" | null>(null);

  const handleIncrement = () => {
    if (value < max) {
      setAnimationDirection("up");
      setIsAnimating(true);
      onChange(value + 1);
      setTimeout(() => setIsAnimating(false), 150);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      setAnimationDirection("down");
      setIsAnimating(true);
      onChange(value - 1);
      setTimeout(() => setIsAnimating(false), 150);
    }
  };

  const btnSize = buttonSize || 36;
  const btnBorderRadius = buttonBorderRadius !== undefined ? buttonBorderRadius : btnSize / 2;

  const getButtonStyle = (disabled: boolean): React.CSSProperties => ({
    width: `${btnSize}px`,
    height: `${btnSize}px`,
    borderRadius: `${btnBorderRadius}px`,
    backgroundColor: disabled
      ? undefined
      : (buttonBackground || accentColor || undefined),
    color: disabled
      ? undefined
      : (buttonTextColor || (buttonBackground || accentColor ? "#fff" : undefined)),
  });

  const containerStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || undefined,
    borderColor: borderColor || undefined,
    borderWidth: borderWidth ? `${borderWidth}px` : undefined,
    borderStyle: borderWidth ? "solid" : undefined,
    borderRadius: borderRadius ? `${borderRadius}px` : undefined,
    padding: padding ? `${padding}px` : undefined,
    height: height ? `${height}px` : undefined,
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border transition-colors",
        !padding && "p-3"
      )}
      style={containerStyle}
    >
      {/* Decrement Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className={cn(
          "flex items-center justify-center",
          "transition-all duration-150 transform",
          "hover:scale-105 active:scale-95",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100",
          !buttonBackground && !accentColor && "bg-muted hover:bg-muted/80 text-foreground"
        )}
        style={getButtonStyle(value <= min)}
        aria-label={isRTL ? "הפחת אורח" : "Remove guest"}
      >
        <Minus className="w-4 h-4" />
      </button>

      {/* Counter Display */}
      <div
        className="flex-1 flex items-center justify-center gap-2"
        style={{ color: textColor || undefined }}
      >
        <Users className="w-4 h-4 opacity-50" />
        <span
          className={cn(
            "font-semibold tabular-nums min-w-[2ch] text-center transition-transform duration-150",
            isAnimating && animationDirection === "up" && "scale-110",
            isAnimating && animationDirection === "down" && "scale-90"
          )}
          style={{ fontSize: numberFontSize ? `${numberFontSize}px` : "24px" }}
        >
          {value}
        </span>
        <span className="text-sm opacity-70">
          {isRTL ? "אורחים" : "guests"}
        </span>
      </div>

      {/* Increment Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className={cn(
          "flex items-center justify-center",
          "transition-all duration-150 transform",
          "hover:scale-105 active:scale-95",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100",
          !buttonBackground && !accentColor && "bg-muted hover:bg-muted/80 text-foreground"
        )}
        style={getButtonStyle(value >= max)}
        aria-label={isRTL ? "הוסף אורח" : "Add guest"}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
