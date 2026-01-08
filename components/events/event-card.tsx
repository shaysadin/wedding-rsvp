"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WeddingEvent, Guest, GuestRsvp } from "@prisma/client";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Heart, MapPin, MoreVertical, Pencil, Trash2, ExternalLink, Users, UserCheck, Clock } from "lucide-react";

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
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -6, transition: { duration: 0.2 } }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Link href={`/${locale}/events/${event.id}`}>
          <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10 dark:hover:shadow-rose-500/5 bg-gradient-to-br from-white to-gray-50/80 dark:from-gray-900 dark:to-gray-900/80 backdrop-blur-sm border-white/50 dark:border-gray-800/50">
            {/* Animated gradient border on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-pink-500 via-rose-500 to-red-500" />
            </div>

            {/* Decorative top gradient */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-red-500" />

            {/* Subtle glow effect */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-rose-500/10 to-pink-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <CardContent className="p-5 relative">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 text-start">
                  <h3 className="font-semibold truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors duration-200">
                    {event.title}
                  </h3>
                  {event.venue && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <MapPin className="h-3 w-3 shrink-0 text-rose-400" />
                      <span className="truncate">{event.venue}</span>
                    </p>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1">
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
                  <motion.div
                    className="relative"
                    whileHover={{ scale: 1.1, rotate: 12 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <div className="rounded-full bg-gradient-to-br from-pink-100 to-rose-100 p-2.5 dark:from-pink-900/40 dark:to-rose-900/40 shadow-sm">
                      <Heart className="h-4 w-4 text-rose-500" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                  </motion.div>
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

              {/* Stats - Enhanced with icons and glass effect */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 p-2.5 border border-slate-200/50 dark:border-slate-700/30 transition-all duration-200 hover:scale-105">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                  </div>
                  <p className="text-lg font-bold">{event.stats.total}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isRTL ? "אורחים" : "Guests"}
                  </p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 p-2.5 border border-emerald-200/50 dark:border-emerald-700/30 transition-all duration-200 hover:scale-105">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {event.stats.accepted}
                  </p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                    {isRTL ? "מאושר" : "Confirmed"}
                  </p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 p-2.5 border border-amber-200/50 dark:border-amber-700/30 transition-all duration-200 hover:scale-105">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                  </div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {event.stats.pending}
                  </p>
                  <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                    {isRTL ? "ממתין" : "Pending"}
                  </p>
                </div>
              </div>

              {/* Progress bar - Enhanced */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {isRTL ? "אחוז אישורים" : "Response rate"}
                  </span>
                  <span className="font-semibold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
                    {acceptanceRate}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gradient-to-r from-muted/50 to-muted/30">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 shadow-sm shadow-emerald-500/30"
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
