"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle2, XCircle, UserCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface EventStatsCardsProps {
  stats: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    totalAttending: number;
  };
  eventId: string;
  activeFilter: string;
  basePath?: string;
}

export function EventStatsCards({ stats, eventId, activeFilter, basePath: customBasePath }: EventStatsCardsProps) {
  const pathname = usePathname();
  const tGuests = useTranslations("guests");
  const tStatus = useTranslations("status");
  const tEvents = useTranslations("events");

  // Get base path without query params (use custom if provided)
  const basePath = customBasePath || pathname?.split("?")[0] || `/dashboard/events/${eventId}`;

  const cards = [
    {
      key: "all",
      label: tGuests("guestCount"),
      value: stats.total,
      icon: Users,
      iconBg: "bg-blue-500",
      cardBg: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-200/50 dark:border-blue-800/30",
      activeClass: "ring-2 ring-blue-500 ring-offset-2",
    },
    {
      key: "pending",
      label: tStatus("pending"),
      value: stats.pending,
      icon: Clock,
      iconBg: "bg-amber-500",
      cardBg: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-200/50 dark:border-amber-800/30",
      activeClass: "ring-2 ring-amber-500 ring-offset-2",
    },
    {
      key: "accepted",
      label: tStatus("accepted"),
      value: stats.accepted,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500",
      cardBg: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
      activeClass: "ring-2 ring-emerald-500 ring-offset-2",
    },
    {
      key: "declined",
      label: tStatus("declined"),
      value: stats.declined,
      icon: XCircle,
      iconBg: "bg-red-500",
      cardBg: "bg-red-50 dark:bg-red-950/40",
      borderColor: "border-red-200/50 dark:border-red-800/30",
      activeClass: "ring-2 ring-red-500 ring-offset-2",
    },
  ];

  return (
    <div className="mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="flex gap-3 px-1 pb-2 sm:grid sm:grid-cols-2 sm:gap-4 sm:pb-0 lg:grid-cols-5">
        {cards.map((card, index) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.15, ease: "easeOut" }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            style={{ willChange: "transform" }}
            className="shrink-0 sm:shrink"
          >
            <Link
              href={card.key === "all" ? basePath : `${basePath}?filter=${card.key}`}
              className="block"
            >
              <Card
                className={cn(
                  "relative w-[140px] cursor-pointer overflow-hidden border transition-all duration-300 hover:shadow-md sm:w-auto",
                  card.cardBg,
                  card.borderColor,
                  activeFilter === card.key && card.activeClass
                )}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 hover:scale-105 sm:h-11 sm:w-11",
                        card.iconBg
                      )}
                    >
                      <card.icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-start">
                      <p className="text-xs font-medium text-muted-foreground truncate sm:text-sm">
                        {card.label}
                      </p>
                      <p className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">
                        {card.value}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}

        {/* Total Attending - Not clickable, just informational */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4 * 0.03, duration: 0.15, ease: "easeOut" }}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          style={{ willChange: "transform" }}
          className="shrink-0 sm:shrink"
        >
          <Card className={cn(
            "relative w-[140px] overflow-hidden border transition-all duration-300 hover:shadow-md sm:w-auto",
            "bg-violet-50 dark:bg-violet-950/40",
            "border-violet-200/50 dark:border-violet-800/30"
          )}>
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500 transition-transform duration-150 hover:scale-105 sm:h-11 sm:w-11">
                  <UserCheck className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-xs font-medium text-muted-foreground truncate sm:text-sm">
                    {tEvents("totalAttending")}
                  </p>
                  <p className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">
                    {stats.totalAttending}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
