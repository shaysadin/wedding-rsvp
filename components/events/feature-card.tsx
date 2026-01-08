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
        "group relative flex flex-col rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300",
        "hover:border-primary/40 hover:shadow-md",
        expandedContent && "cursor-pointer",
        className
      )}
    >
      {/* Card Header - Always visible */}
      <div
        onClick={handleCardClick}
        className={cn(
          "flex items-center gap-3 p-4",
          expandedContent && "cursor-pointer"
        )}
      >
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        {/* Title and Summary */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-sm text-muted-foreground truncate">{summary}</p>
        </div>

        {/* Expand/Collapse Button */}
        {expandedContent && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
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
            <div className="px-4 pb-4 pt-0">
              <div className="border-t pt-3 space-y-3">
                {expandedContent}

                {/* View All Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  asChild
                >
                  <Link href={href}>
                    {isRTL ? "צפה בהכל" : "View All"}
                    <NavArrow className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Navigate - when collapsed and no expanded content */}
      {!expandedContent && (
        <div className="px-4 pb-4 pt-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href={href}>
              <span>{isRTL ? "לחץ לפתיחה" : "Open"}</span>
              <NavArrow className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
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
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-medium",
          trend === "up" && "text-green-600",
          trend === "down" && "text-red-600"
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {showPercentage ? `${percentage}%` : `${value}/${max}`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
