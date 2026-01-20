import * as React from "react";
import { cn } from "@/lib/utils";

function hexToRgba(hex: string, alpha: number = 1): string {
  let hexValue = hex.replace("#", "");

  if (hexValue.length === 3) {
    hexValue = hexValue
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const r = parseInt(hexValue.substring(0, 2), 16);
  const g = parseInt(hexValue.substring(2, 4), 16);
  const b = parseInt(hexValue.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.error("Invalid hex color:", hex);
    return "rgba(0, 0, 0, 1)";
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface GlowingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  glowColor?: string;
  asChild?: boolean;
}

const GlowingButton = React.forwardRef<HTMLButtonElement, GlowingButtonProps>(
  ({ children, className, glowColor = "#a855f7", ...props }, ref) => {
    const glowColorRgba = hexToRgba(glowColor, 0.6);
    const glowColorVia = hexToRgba(glowColor, 0.08);
    const glowColorTo = hexToRgba(glowColor, 0.15);
    const glowColorShadow = hexToRgba(glowColor, 0.4);

    return (
      <button
        ref={ref}
        style={
          {
            "--glow-color": glowColorRgba,
            "--glow-color-via": glowColorVia,
            "--glow-color-to": glowColorTo,
            "--glow-color-shadow": glowColorShadow,
          } as React.CSSProperties
        }
        className={cn(
          "h-10 px-5 text-sm rounded-md border flex items-center justify-center relative transition-colors overflow-hidden bg-gradient-to-t duration-200 whitespace-nowrap gap-2 sm:h-11 sm:px-6",
          "from-white to-white dark:from-gray-900 dark:to-gray-800 text-foreground border-border shadow-sm dark:border-gray-700",
          "after:inset-0 after:absolute after:rounded-[inherit] after:bg-gradient-to-r after:from-transparent after:from-40% after:via-[var(--glow-color-via)] after:to-[var(--glow-color-to)] after:via-70% after:shadow-[rgba(0,0,0,0.05)_0px_1px_0px_inset] after:z-0",
          "before:absolute before:w-[4px] hover:before:translate-x-full before:transition-all before:duration-200 before:h-[50%] before:bg-[var(--glow-color)] before:right-0 before:rounded-l before:shadow-[-2px_0_8px_var(--glow-color-shadow)] before:z-10",
          "[&>*]:relative [&>*]:z-20",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlowingButton.displayName = "GlowingButton";

export { GlowingButton };
