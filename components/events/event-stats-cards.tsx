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
    <div className="w-full">
      {/* Mobile: Horizontal scroll */}
      <div className="overflow-x-auto py-2 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:pb-0">
        <div className="flex gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-5 min-w-max sm:min-w-0">
          {cards.map((card, index) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.15, ease: "easeOut" }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              style={{ willChange: "transform" }}
            >
              <Link
                href={card.key === "all" ? basePath : `${basePath}?filter=${card.key}`}
                className="block"
              >
                <Card
                  className={cn(
                    "relative w-[130px] cursor-pointer overflow-hidden border transition-all duration-300 hover:shadow-md sm:w-auto",
                    card.cardBg,
                    card.borderColor,
                    activeFilter === card.key && card.activeClass
                  )}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 sm:h-10 sm:w-10 sm:rounded-xl",
                          card.iconBg
                        )}
                      >
                        <card.icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-start">
                        <p className="text-[11px] font-medium text-muted-foreground truncate sm:text-xs">
                          {card.label}
                        </p>
                        <p className="text-lg font-bold tracking-tight sm:text-xl">
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
          >
            <Card className={cn(
              "relative w-[130px] overflow-hidden border transition-all duration-300 hover:shadow-md sm:w-auto",
              "bg-violet-50 dark:bg-violet-950/40",
              "border-violet-200/50 dark:border-violet-800/30"
            )}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500 transition-transform duration-150 sm:h-10 sm:w-10 sm:rounded-xl">
                    <UserCheck className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-[11px] font-medium text-muted-foreground truncate sm:text-xs">
                      {tEvents("totalAttending")}
                    </p>
                    <p className="text-lg font-bold tracking-tight sm:text-xl">
                      {stats.totalAttending}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
