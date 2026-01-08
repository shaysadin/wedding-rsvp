"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";

interface FeatureCardProps {
  title: string;
  icon: keyof typeof Icons;
  href: string;
  summary: React.ReactNode;
  expandedContent?: React.ReactNode;
  locale: string;
  className?: string;
}

export function FeatureCard({
  title,
  icon,
  href,
  summary,
  expandedContent,
  locale,
  className,
}: FeatureCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const Icon = Icons[icon] || Icons.arrowRight;
  const isRTL = locale === "he";
  const NavArrow = isRTL ? ArrowLeft : ArrowRight;

  const handleCardClick = () => {
    if (expandedContent) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-xl overflow-hidden transition-all duration-300",
        "bg-white dark:bg-gray-900/90",
        "border border-gray-200/80 dark:border-gray-700/60",
        "shadow-sm",
        "hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-500/5",
        "hover:border-violet-200 dark:hover:border-violet-700/40",
        className
      )}
    >
      {/* Card Header - Always visible */}
      <div
        onClick={handleCardClick}
        className={cn(
          "relative flex items-center gap-3 p-4",
          expandedContent && "cursor-pointer"
        )}
      >
        {/* Icon */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/30 dark:to-indigo-900/30 border border-violet-100 dark:border-violet-800/40 transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:shadow-violet-200/50 dark:group-hover:shadow-violet-900/30">
          <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>

        {/* Title and Summary */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors duration-200">{title}</h3>
          <p className="text-sm text-muted-foreground truncate">{summary}</p>
        </div>

        {/* Expand/Collapse Button - Only show if has expandable content */}
        {expandedContent && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </Button>
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && expandedContent && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-0 pt-0">
              <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
                {expandedContent}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Open Button - Always visible at the bottom */}
      <div className="px-4 pb-4 pt-3 mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between border-violet-200 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm hover:shadow-violet-200/50 dark:hover:shadow-violet-900/30 rounded-lg transition-all duration-200 group/btn"
          asChild
        >
          <Link href={href}>
            <span className="font-medium">{isRTL ? "פתח" : "Open"}</span>
            <NavArrow className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-0.5 rtl:group-hover/btn:-translate-x-0.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// Simple stat display component for use in expanded content
export function FeatureStat({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          trend === "up" && "text-emerald-600 dark:text-emerald-400",
          trend === "down" && "text-red-500 dark:text-red-400",
          !trend && "text-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// Progress bar component for use in expanded content
export function FeatureProgress({
  label,
  value,
  max,
  showPercentage = true,
}: {
  label: string;
  value: number;
  max: number;
  showPercentage?: boolean;
}) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">
          {showPercentage ? `${percentage}%` : `${value}/${max}`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/30">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 dark:from-violet-400 dark:to-indigo-400"
        />
      </div>
    </div>
  );
}
