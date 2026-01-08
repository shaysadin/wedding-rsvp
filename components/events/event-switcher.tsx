"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronDown, Calendar, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventOption } from "@/contexts/event-context";

interface EventSwitcherProps {
  currentEvent: EventOption;
  events: EventOption[];
  locale: string;
  expanded?: boolean;
  className?: string;
  onEventChange?: () => void;
}

export function EventSwitcher({
  currentEvent,
  events,
  locale,
  expanded = true,
  className,
  onEventChange,
}: EventSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isRTL = locale === "he";

  // Extract the sub-page from current path (e.g., /he/events/abc123/tasks -> tasks)
  const getCurrentSubPage = () => {
    const match = pathname.match(/\/events\/[^/]+\/(.+)/);
    return match ? match[1] : "";
  };

  const handleSelect = (eventId: string) => {
    setOpen(false);
    onEventChange?.();

    // Navigate to the same sub-page for the new event
    const subPage = getCurrentSubPage();
    const newPath = subPage
      ? `/${locale}/events/${eventId}/${subPage}`
      : `/${locale}/events/${eventId}`;

    router.push(newPath);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(isRTL ? "he-IL" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (events.length === 0) {
    return null;
  }

  // If only one event and not expanded, show minimal badge
  if (events.length === 1 && !expanded) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
      </div>
    );
  }

  // If only one event and expanded, show a simple badge
  if (events.length === 1) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-3 py-2",
        className
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Calendar className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col items-start text-start truncate">
          <span className="font-medium truncate text-sm">{currentEvent.title}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(currentEvent.dateTime)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between gap-2 h-auto py-2 w-full",
            !expanded && "w-9 p-0 justify-center",
            className
          )}
        >
          {expanded ? (
            <>
              <div className="flex items-center gap-2 truncate">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start text-start truncate">
                  <span className="font-medium truncate text-sm max-w-[140px]">
                    {currentEvent.title}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {formatDate(currentEvent.dateTime)}
                  </span>
                </div>
              </div>
              <motion.div
                animate={{ rotate: open ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </motion.div>
            </>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <AnimatePresence>
        {open && (
          <DropdownMenuContent
            align={isRTL ? "start" : "end"}
            className="w-[280px] p-2"
            asChild
            forceMount
          >
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className="mb-2 px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {isRTL ? "החלף אירוע" : "Switch Event"}
                </p>
              </div>
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                >
                  <DropdownMenuItem
                    onClick={() => handleSelect(event.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer rounded-lg transition-colors",
                      event.id === currentEvent.id && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                      event.id === currentEvent.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-start">
                      <p className={cn(
                        "font-medium truncate",
                        event.id === currentEvent.id && "text-primary"
                      )}>
                        {event.title}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(event.dateTime)}</span>
                      </div>
                    </div>
                    {event.id === currentEvent.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      </motion.div>
                    )}
                  </DropdownMenuItem>
                </motion.div>
              ))}
            </motion.div>
          </DropdownMenuContent>
        )}
      </AnimatePresence>
    </DropdownMenu>
  );
}
