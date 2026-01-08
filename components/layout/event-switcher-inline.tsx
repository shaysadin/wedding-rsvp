"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Check, Calendar, MapPin } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { EventOption } from "@/contexts/event-context";

interface EventSwitcherInlineProps {
  currentEvent: EventOption;
  events: EventOption[];
  locale: string;
  onEventChange?: () => void;
}

export function EventSwitcherInline({
  currentEvent,
  events,
  locale,
  onEventChange,
}: EventSwitcherInlineProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isRTL = locale === "he";

  // Extract the sub-page from current path
  const getCurrentSubPage = () => {
    const match = pathname.match(/\/events\/[^/]+\/(.+)/);
    return match ? match[1] : "";
  };

  const handleSelect = (eventId: string) => {
    if (eventId === currentEvent.id) {
      onEventChange?.();
      return;
    }

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

  return (
    <div className="flex flex-col gap-2">
      {events.map((event, index) => (
        <motion.button
          key={event.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          onClick={() => handleSelect(event.id)}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all",
            event.id === currentEvent.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <div className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
            event.id === currentEvent.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}>
            <Calendar className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className={cn(
              "font-semibold truncate",
              event.id === currentEvent.id && "text-primary"
            )}>
              {event.title}
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(event.dateTime)}
            </p>
          </div>
          {event.id === currentEvent.id && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <Check className="h-5 w-5" />
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}
