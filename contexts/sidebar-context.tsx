"use client";

import * as React from "react";

const STORAGE_KEY = "sidebar-expanded";

export interface SidebarContextValue {
  /** Whether the sidebar is expanded (desktop) */
  isExpanded: boolean;
  /** Whether the mobile sidebar sheet is open */
  isMobileOpen: boolean;
  /** Whether the user is hovering over a collapsed sidebar */
  isHovered: boolean;
  /** Toggle sidebar expanded/collapsed state */
  toggleSidebar: () => void;
  /** Toggle mobile sidebar open/closed */
  toggleMobileSidebar: () => void;
  /** Set hover state for collapsed sidebar expand-on-hover */
  setIsHovered: (hovered: boolean) => void;
  /** Close mobile sidebar */
  closeMobileSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(undefined);

interface SidebarProviderProps {
  children: React.ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Load from localStorage on mount (client-side only)
  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setIsExpanded(stored === "true");
    }
    setIsHydrated(true);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const toggleMobileSidebar = React.useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = React.useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const value = React.useMemo(
    () => ({
      isExpanded,
      isMobileOpen,
      isHovered,
      toggleSidebar,
      toggleMobileSidebar,
      setIsHovered,
      closeMobileSidebar,
    }),
    [isExpanded, isMobileOpen, isHovered, toggleSidebar, toggleMobileSidebar, closeMobileSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

/**
 * Helper hook to determine if sidebar should appear expanded
 * Returns true if explicitly expanded OR if collapsed but hovered
 */
export function useSidebarExpanded() {
  const { isExpanded, isHovered } = useSidebar();
  return isExpanded || isHovered;
}
