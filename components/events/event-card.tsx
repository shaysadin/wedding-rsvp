"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WeddingEvent, Guest, GuestRsvp, CollaboratorRole } from "@prisma/client";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { MapPin, MoreVertical, Pencil, Trash2, ExternalLink, Users, UserCheck, Clock, ArrowUpRight, Archive, Share2 } from "lucide-react";
import { toast } from "sonner";

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
import { softArchiveEvent } from "@/actions/events";

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
  owner?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  isOwner?: boolean;
  collaboratorRole?: CollaboratorRole | null;
};

interface EventCardProps {
  event: EventWithStats;
  locale: string;
}

export function EventCard({ event, locale }: EventCardProps) {
  const t = useTranslations("events");
  const tCollab = useTranslations("collaboration");
  const router = useRouter();
  const isRTL = locale === "he";
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Check if user is owner (default to true for backwards compatibility)
  const isOwner = event.isOwner !== false;
  const isShared = event.isOwner === false;

  const eventDate = new Date(event.dateTime);
  const isUpcoming = eventDate > new Date();
  const daysUntil = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await softArchiveEvent(event.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "האירוע הועבר לארכיון בהצלחה" : "Event archived successfully");
        router.refresh();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהעברה לארכיון" : "Failed to archive event");
    } finally {
      setIsArchiving(false);
    }
  };

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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Link href={`/${locale}/events/${event.id}`}>
          <Card className={cn(
            "group relative overflow-hidden cursor-pointer transition-all duration-200",
            "bg-background hover:bg-muted/30",
            "border-2 border-border/60 hover:border-primary/50",
            "shadow-sm hover:shadow-lg hover:shadow-primary/10 dark:hover:shadow-primary/5",
            "hover:-translate-y-1"
          )}>
            {/* Click indicator arrow - always visible */}
            <div className="absolute top-4 end-4 flex items-center gap-1.5 text-xs text-muted-foreground group-hover:text-primary transition-colors z-10">
              {isShared && (
                <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 me-1">
                  <Share2 className="h-3 w-3" />
                  {tCollab("sharedWithYou")}
                </span>
              )}
              <span className="hidden sm:inline">{isRTL ? "לחץ לניהול" : "Click to manage"}</span>
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>

            <CardContent className="p-5 relative">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 text-start pe-20">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors duration-200">
                    {event.title}
                  </h3>
                  {event.venue && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
                      <span className="truncate">{event.venue}</span>
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1 absolute top-4 end-24">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.preventDefault()}
                        className="rounded-full p-1.5 opacity-0 transition-all hover:bg-muted/80 group-hover:opacity-100 hover:scale-110"
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isRTL ? "start" : "end"} className="w-48 backdrop-blur-xl bg-background/95">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/${locale}/events/${event.id}`);
                        }}
                      >
                        <ExternalLink className="me-2 h-4 w-4" />
                        {isRTL ? "פתח אירוע" : "Open Event"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(`/${locale}/events/${event.id}?edit=true`);
                        }}
                      >
                        <Pencil className="me-2 h-4 w-4" />
                        {isRTL ? "ערוך אירוע" : "Edit Event"}
                      </DropdownMenuItem>
                      {isOwner && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              handleArchive();
                            }}
                            disabled={isArchiving}
                            className="text-amber-600 focus:text-amber-600 dark:text-amber-400 dark:focus:text-amber-400"
                          >
                            <Archive className="me-2 h-4 w-4" />
                            {isRTL ? "העבר לארכיון" : "Archive Event"}
                          </DropdownMenuItem>
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
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Date & Time - Keeping as requested */}
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-2.5">
                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-background shadow-sm">
                  <span className="text-[10px] font-medium uppercase text-muted-foreground">
                    {eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", { month: "short" })}
                  </span>
                  <span className="text-lg font-bold leading-none">
                    {eventDate.getDate()}
                  </span>
                </div>
                <div className="flex-1 text-start">
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

              {/* Stats - Clean minimal design */}
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-lg font-bold">{event.stats.total}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {isRTL ? "אורחים" : "Guests"}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {event.stats.accepted}
                    </p>
                  </div>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                    {isRTL ? "מאושר" : "Confirmed"}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {event.stats.pending}
                    </p>
                  </div>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                    {isRTL ? "ממתין" : "Pending"}
                  </p>
                </div>
              </div>

              {/* Progress bar - Clean */}
              <div className="mt-4 pt-3 border-t">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isRTL ? "אחוז אישורים" : "Response rate"}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {acceptanceRate}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${acceptanceRate}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

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
