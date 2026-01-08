"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export interface EventOption {
  id: string;
  title: string;
  dateTime: Date;
  location: string;
  venue?: string | null;
}

export interface EventContextValue {
  event: EventOption | null;
  eventId: string | null;
  events: EventOption[];
  isLoading: boolean;
  locale: string;
}

const EventContext = React.createContext<EventContextValue | undefined>(undefined);

interface EventProviderProps {
  children: React.ReactNode;
  event: EventOption | null;
  events: EventOption[];
  locale: string;
}

export function EventProvider({ children, event, events, locale }: EventProviderProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const value = React.useMemo(
    () => ({
      event,
      eventId: event?.id ?? null,
      events,
      isLoading,
      locale,
    }),
    [event, events, isLoading, locale]
  );

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = React.useContext(EventContext);
  if (context === undefined) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}

export function useEventId() {
  const context = useEvent();
  return context.eventId;
}

export function useCurrentEvent() {
  const context = useEvent();
  return context.event;
}

export function useAllEvents() {
  const context = useEvent();
  return context.events;
}

export function useEventLocale() {
  const context = useEvent();
  return context.locale;
}

/**
 * Helper to get the current sub-page from a pathname within the events route
 * e.g., /he/events/abc123/tasks -> "tasks"
 * e.g., /he/events/abc123 -> ""
 */
export function useCurrentEventSubPage() {
  const pathname = usePathname();

  // Match /[locale]/events/[eventId]/[subPage]
  const match = pathname.match(/\/events\/[^/]+\/(.+)/);
  return match ? match[1] : "";
}
