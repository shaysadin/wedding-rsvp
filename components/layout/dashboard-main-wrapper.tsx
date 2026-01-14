"use client";

import { cn } from "@/lib/utils";
import { useSidebarExpanded } from "@/contexts/sidebar-context";

interface DashboardMainWrapperProps {
  children: React.ReactNode;
  isRTL?: boolean;
}

export function DashboardMainWrapper({ children, isRTL = false }: DashboardMainWrapperProps) {
  const isExpanded = useSidebarExpanded();

  return (
    <div
      className={cn(
        "flex flex-1 flex-col transition-all duration-300 ease-in-out",
        isExpanded
          ? isRTL ? "lg:mr-[290px]" : "lg:ml-[290px]"
          : isRTL ? "lg:mr-[90px]" : "lg:ml-[90px]"
      )}
    >
      {children}
    </div>
  );
}
