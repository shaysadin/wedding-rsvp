"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { ArrowUp, ArrowDown, LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  icon?: LucideIcon;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  trendLabel,
  icon: Icon,
  className,
}) => {
  const isPositive = trend && trend >= 0;
  const TrendIcon = isPositive ? ArrowUp : ArrowDown;

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6",
        className
      )}
    >
      {Icon && (
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <Icon className="text-gray-800 size-6 dark:text-white/90" />
        </div>
      )}

      <div className={cn("flex items-end justify-between", Icon && "mt-5")}>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {label}
          </span>
          <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
            {value}
          </h4>
        </div>

        {trend !== undefined && (
          <Badge color={isPositive ? "success" : "error"}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend)}%{trendLabel && ` ${trendLabel}`}
          </Badge>
        )}
      </div>
    </div>
  );
};

// Simple stat card without trend
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  iconColor = "text-gray-800 dark:text-white/90",
  className,
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6",
        className
      )}
    >
      {Icon && (
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
          <Icon className={cn("size-6", iconColor)} />
        </div>
      )}

      <div className={Icon ? "mt-5" : ""}>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
          {value}
        </h4>
      </div>
    </div>
  );
};

export { MetricCard, StatCard };
export default MetricCard;
