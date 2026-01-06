"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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

export interface EventOption {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
}

interface EventDropdownSelectorProps {
  events: EventOption[];
  selectedEventId: string;
  locale: string;
  basePath?: string;
  className?: string;
}

export function EventDropdownSelector({
  events,
  selectedEventId,
  locale,
  basePath,
  className,
}: EventDropdownSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const isRTL = locale === "he";

  const handleSelect = (eventId: string) => {
    setOpen(false);

    // Build the new URL with eventId parameter
    const params = new URLSearchParams(searchParams.toString());
    params.set("eventId", eventId);

    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
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

  // If only one event, show a simple badge instead of dropdown
  if (events.length === 1) {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg border bg-card px-3 py-2",
        className
      )}>
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{selectedEvent?.title}</span>
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
            "justify-between gap-2 min-w-[200px] max-w-[300px] h-auto py-2",
            className
          )}
        >
          <div className={cn(
            "flex items-center gap-2 truncate",
            isRTL && "flex-row-reverse"
          )}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className={cn(
              "flex flex-col items-start text-start truncate",
              isRTL && "items-end text-end"
            )}>
              <span className="font-medium truncate max-w-[180px]">
                {selectedEvent?.title}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {selectedEvent && formatDate(selectedEvent.dateTime)}
              </span>
            </div>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </motion.div>
        </Button>
      </DropdownMenuTrigger>
      <AnimatePresence>
        {open && (
          <DropdownMenuContent
            align={isRTL ? "start" : "end"}
            className="w-[300px] p-2"
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
                  {isRTL ? "בחר אירוע" : "Select Event"}
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
                      event.id === selectedEventId && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                      event.id === selectedEventId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}>
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div className={cn(
                      "flex-1 min-w-0",
                      isRTL && "text-right"
                    )}>
                      <p className={cn(
                        "font-medium truncate",
                        event.id === selectedEventId && "text-primary"
                      )}>
                        {event.title}
                      </p>
                      <div className={cn(
                        "flex items-center gap-1 text-xs text-muted-foreground",
                        isRTL && "flex-row-reverse justify-end"
                      )}>
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                        <span className="mx-1">•</span>
                        <span>{formatDate(event.dateTime)}</span>
                      </div>
                    </div>
                    {event.id === selectedEventId && (
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
