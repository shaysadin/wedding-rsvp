"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/contexts/sidebar-context";

/**
 * Sidebar backdrop overlay for mobile
 * Displays a semi-transparent overlay when mobile sidebar is open
 * Clicking the backdrop closes the sidebar
 */
export function SidebarBackdrop() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();

  return (
    <AnimatePresence>
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}
    </AnimatePresence>
  );
}
