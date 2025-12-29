"use client";

import * as React from "react";
import { useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExpandableTableWrapperProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  expandedClassName?: string;
  headerActions?: React.ReactNode;
}

export function ExpandableTableWrapper({
  children,
  title,
  className,
  expandedClassName,
  headerActions,
}: ExpandableTableWrapperProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Normal view with expand button */}
      <div className={cn("relative", className)}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute end-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 backdrop-blur-sm hover:bg-muted"
          onClick={() => setIsExpanded(true)}
          title="Expand table"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        {children}
      </div>

      {/* Expanded modal view */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent
          size="full"
          className={cn(
            "flex h-[90vh] max-h-[90vh] flex-col gap-0 [&>div]:p-0",
            expandedClassName
          )}
        >
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-4">
              {title && <DialogTitle>{title}</DialogTitle>}
              {headerActions}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsExpanded(false)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Context for sharing expanded state with child components (like bulk action bars)
interface ExpandedTableContextValue {
  isExpanded: boolean;
}

const ExpandedTableContext = React.createContext<ExpandedTableContextValue>({ isExpanded: false });

export function useExpandedTable() {
  return React.useContext(ExpandedTableContext);
}

// Advanced version with context support for bulk action bars
interface ExpandableTableContainerProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  expandedClassName?: string;
  bulkActionsBar?: React.ReactNode;
}

export function ExpandableTableContainer({
  children,
  title,
  className,
  expandedClassName,
  bulkActionsBar,
}: ExpandableTableContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const contextValue = React.useMemo(() => ({ isExpanded }), [isExpanded]);

  const content = (
    <ExpandedTableContext.Provider value={contextValue}>
      {bulkActionsBar}
      {children}
    </ExpandedTableContext.Provider>
  );

  return (
    <>
      {/* Normal view with expand button */}
      <div className={cn("relative", className)}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute end-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 backdrop-blur-sm hover:bg-muted"
          onClick={() => setIsExpanded(true)}
          title="Expand table"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        {content}
      </div>

      {/* Expanded modal view */}
      <AnimatePresence>
        {isExpanded && (
          <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
            <DialogContent
              size="full"
              className={cn(
                "flex h-[90vh] max-h-[90vh] flex-col gap-0 [&>div]:p-0",
                expandedClassName
              )}
            >
              <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-4">
                  {title && <DialogTitle>{title}</DialogTitle>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsExpanded(false)}
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                {content}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
