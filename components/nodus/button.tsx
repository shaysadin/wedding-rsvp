import { cn } from "@/lib/utils";
import React from "react";

export const Button = <T extends React.ElementType = "button">({
  children,
  variant = "primary",
  className,
  as,
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "brand";
  className?: string;
  as?: T;
} & Omit<
  React.ComponentProps<T>,
  "children" | "variant" | "className" | "as"
>) => {
  const Component = as || "button";

  return (
    <Component
      {...props}
      className={cn(
        "block rounded-xl px-6 py-2 text-center text-sm font-medium transition duration-150 active:scale-[0.98] sm:text-base",
        variant === "primary"
          ? "bg-charcoal-900 text-white dark:bg-white dark:text-black"
          : variant === "brand"
            ? "bg-brand text-white"
            : "border-divide border bg-white text-black transition duration-200 hover:bg-gray-300 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800",
        className,
      )}
    >
      {children}
    </Component>
  );
};

// Alias for backward compatibility
export const NodusButton = Button;

// Glowing rotating border button with traveling light effect
export const GlowingButton = <T extends React.ElementType = "button">({
  children,
  className,
  as,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  as?: T;
} & Omit<React.ComponentProps<T>, "children" | "className" | "as">) => {
  const Component = as || "button";

  return (
    <Component
      {...props}
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-xl p-[1.5px] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
        className,
      )}
    >
      {/* Static border */}
      <span className="absolute inset-0 rounded-xl bg-neutral-700 dark:bg-neutral-600" />

      {/* Traveling glow segment */}
      <span className="absolute inset-[-200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,transparent_40%,#a855f7_50%,transparent_60%,transparent_100%)]" />

      {/* Glow blur effect */}
      <span className="absolute inset-[-200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,transparent_40%,#a855f7_50%,transparent_60%,transparent_100%)] opacity-60 blur-xl" />

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center rounded-[10px] bg-charcoal-900 px-6 py-2 text-sm font-medium text-white transition-colors dark:bg-neutral-900 sm:text-base">
        {children}
      </span>
    </Component>
  );
};
