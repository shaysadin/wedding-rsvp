"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WeddingEvent, Guest, GuestRsvp } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Heart, MapPin, MoreVertical, Pencil, Trash2, ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteEventModal } from "@/components/events/delete-event-modal";

// Serialized event type for client components (Decimal converted to number)
type SerializedWeddingEvent = Omit<WeddingEvent, 'totalBudget'> & {
  totalBudget: number | null;
};

type EventWithStats = SerializedWeddingEvent & {
  guests?: (Guest & { rsvp: GuestRsvp | null })[];
  _count?: { guests: number };
  stats: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    totalGuestCount: number;
  };
};

interface EventCardProps {
  event: EventWithStats;
  locale: string;
}

export function EventCard({ event, locale }: EventCardProps) {
  const t = useTranslations("events");
  const router = useRouter();
  const isRTL = locale === "he";
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const eventDate = new Date(event.dateTime);
  const isUpcoming = eventDate > new Date();
  const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const formattedTime = eventDate.toLocaleTimeString(isRTL ? "he-IL" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const acceptanceRate = event.stats.total > 0
    ? Math.round((event.stats.accepted / event.stats.total) * 100)
    : 0;

  return (
    <>
      <Link href={`/${locale}/dashboard/events/${event.id}`}>
        <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200">
        {/* Decorative top gradient */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500" />

        <CardContent className="p-5">
          {/* Header */}
          <div className={cn(
            "flex items-start justify-between gap-3",
            isRTL && "flex-row-reverse"
          )}>
            <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              {event.venue && (
                <p className={cn(
                  "mt-1 flex items-center gap-1 text-xs text-muted-foreground truncate",
                  isRTL && "flex-row-reverse justify-end"
                )}>
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </p>
              )}
            </div>
            <div className="shrink-0 flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.preventDefault()}
                    className="rounded-full p-1.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/${locale}/dashboard/events/${event.id}`);
                    }}
                  >
                    <ExternalLink className="me-2 h-4 w-4" />
                    {isRTL ? "פתח אירוע" : "Open Event"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/${locale}/dashboard/events/${event.id}?edit=true`);
                    }}
                  >
                    <Pencil className="me-2 h-4 w-4" />
                    {isRTL ? "ערוך אירוע" : "Edit Event"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setIsDeleteModalOpen(true);
                    }}
                    className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                  >
                    <Trash2 className="me-2 h-4 w-4" />
                    {isRTL ? "מחק אירוע" : "Delete Event"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="rounded-full bg-gradient-to-br from-pink-100 to-rose-100 p-2 dark:from-pink-900/30 dark:to-rose-900/30 transition-transform duration-150 group-hover:rotate-12">
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className={cn(
            "mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-2.5",
            isRTL && "flex-row-reverse"
          )}>
            <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-background shadow-sm">
              <span className="text-[10px] font-medium uppercase text-muted-foreground">
                {eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", { month: "short" })}
              </span>
              <span className="text-lg font-bold leading-none">
                {eventDate.getDate()}
              </span>
            </div>
            <div className={cn("flex-1", isRTL && "text-right")}>
              <p className="text-sm font-medium">{formattedDate}</p>
              <p className="text-xs text-muted-foreground">{formattedTime}</p>
            </div>
            {isUpcoming && daysUntil <= 30 && (
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                daysUntil <= 7
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {daysUntil === 0
                  ? (isRTL ? "היום!" : "Today!")
                  : daysUntil === 1
                    ? (isRTL ? "מחר" : "Tomorrow")
                    : (isRTL ? `עוד ${daysUntil} ימים` : `${daysUntil} days`)}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className={cn(
            "mt-4 grid grid-cols-3 gap-2 text-center",
            isRTL && "direction-rtl"
          )}>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="text-lg font-semibold">{event.stats.total}</p>
              <p className="text-[10px] text-muted-foreground">
                {isRTL ? "אורחים" : "Guests"}
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {event.stats.accepted}
              </p>
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                {isRTL ? "מאושר" : "Confirmed"}
              </p>
            </div>
            <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {event.stats.pending}
              </p>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                {isRTL ? "ממתין" : "Pending"}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className={cn(
              "mb-1 flex items-center justify-between text-xs",
              isRTL && "flex-row-reverse"
            )}>
              <span className="text-muted-foreground">
                {isRTL ? "אחוז אישורים" : "Response rate"}
              </span>
              <span className="font-medium">{acceptanceRate}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-500"
                style={{ width: `${acceptanceRate}%` }}
              />
            </div>
          </div>
        </CardContent>
        </Card>
      </Link>

      <DeleteEventModal
        eventId={event.id}
        eventTitle={event.title}
        guestCount={event.stats.total}
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
      />
    </>
  );
}
