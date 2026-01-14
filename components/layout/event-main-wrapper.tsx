"use client";

import { cn } from "@/lib/utils";
import { useSidebarExpanded } from "@/contexts/sidebar-context";

interface EventMainWrapperProps {
  children: React.ReactNode;
  isRTL?: boolean;
}

export function EventMainWrapper({ children, isRTL = false }: EventMainWrapperProps) {
  const isExpanded = useSidebarExpanded();

  return (
    <div
      className={cn(
        "flex flex-1 flex-col overflow-y-auto transition-all duration-300 ease-in-out",
        isExpanded
          ? isRTL ? "lg:mr-[260px]" : "lg:ml-[260px]"
          : isRTL ? "lg:mr-[80px]" : "lg:ml-[80px]"
      )}
    >
      {children}
    </div>
  );
}
