"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface EventStatsCardsProps {
  stats: {
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    maybe: number;
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
      largeScreenOnly: false,
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
      largeScreenOnly: false,
    },
    {
      key: "accepted",
      label: tStatus("accepted"),
      value: stats.totalAttending,
      icon: CheckCircle2,
      iconBg: "bg-emerald-500",
      cardBg: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200/50 dark:border-emerald-800/30",
      activeClass: "ring-2 ring-emerald-500 ring-offset-2",
      largeScreenOnly: false,
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
      largeScreenOnly: false,
    },
    {
      key: "maybe",
      label: tStatus("maybe"),
      value: stats.maybe,
      icon: HelpCircle,
      iconBg: "bg-violet-500",
      cardBg: "bg-violet-50 dark:bg-violet-950/40",
      borderColor: "border-violet-200/50 dark:border-violet-800/30",
      activeClass: "ring-2 ring-violet-500 ring-offset-2",
      largeScreenOnly: true,
    },
  ];

  return (
    <div className="w-full">
      {/* Mobile: Horizontal scroll */}
      <div className="py-2 sm:mx-0 sm:px-0 sm:overflow-visible sm:pb-0">
        <div className="grid grid-cols-2 gap-4 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 min-w-max">
          {cards.map((card, index) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.15, ease: "easeOut" }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              style={{ willChange: "transform" }}
              className={card.largeScreenOnly ? "hidden xl:block" : ""}
            >
              <Link
                href={card.key === "all" ? basePath : `${basePath}?filter=${card.key}`}
                className="block"
              >
                <Card
                  className={cn(
                    "relative w-full cursor-pointer overflow-hidden border transition-all duration-300 hover:shadow-md sm:w-auto",
                    card.cardBg,
                    card.borderColor,
                    activeFilter === card.key && card.activeClass
                  )}
                >
                  <CardContent className="px-3 py-4 sm:p-4">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 sm:h-10 sm:w-10 sm:rounded-xl",
                          card.iconBg
                        )}
                      >
                        <card.icon className="h-5 w-5 text-white sm:h-5 sm:w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-start">
                        <p className="text-[12px] font-medium text-muted-foreground truncate sm:text-xs">
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

        </div>
      </div>
    </div>
  );
}
