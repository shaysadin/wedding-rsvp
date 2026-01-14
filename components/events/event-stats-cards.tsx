"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, Clock, CheckCircle2, XCircle, UserCheck } from "lucide-react";

import { cn } from "@/lib/utils";

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
      iconBg: "bg-gray-100 dark:bg-gray-800",
      iconColor: "text-gray-800 dark:text-white/90",
      ringColor: "ring-brand-500",
    },
    {
      key: "pending",
      label: tStatus("pending"),
      value: stats.pending,
      icon: Clock,
      iconBg: "bg-warning-50 dark:bg-warning-500/15",
      iconColor: "text-warning-500",
      ringColor: "ring-warning-500",
    },
    {
      key: "accepted",
      label: tStatus("accepted"),
      value: stats.accepted,
      icon: CheckCircle2,
      iconBg: "bg-success-50 dark:bg-success-500/15",
      iconColor: "text-success-500",
      ringColor: "ring-success-500",
    },
    {
      key: "declined",
      label: tStatus("declined"),
      value: stats.declined,
      icon: XCircle,
      iconBg: "bg-error-50 dark:bg-error-500/15",
      iconColor: "text-error-500",
      ringColor: "ring-error-500",
    },
    {
      key: "attending",
      label: tEvents("totalAttending"),
      value: stats.totalAttending,
      icon: UserCheck,
      iconBg: "bg-brand-50 dark:bg-brand-500/15",
      iconColor: "text-brand-500",
      ringColor: "ring-brand-500",
      isStatic: true,
    },
  ];

  const renderCardContent = (card: typeof cards[0]) => (
    <>
      {/* Icon */}
      <div
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
          card.iconBg
        )}
      >
        <card.icon className={cn("size-6", card.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-start">
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {card.label}
        </p>
        <h4 className="mt-1 font-bold text-gray-800 text-xl dark:text-white/90">
          {card.value}
        </h4>
      </div>
    </>
  );

  return (
    <div className="w-full">
      {/* Mobile: Horizontal scroll */}
      <div className="overflow-x-auto py-2 px-1 sm:mx-0 sm:px-0 sm:overflow-visible sm:pb-0">
        <div className="flex gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-5 min-w-max sm:min-w-0">
          {cards.map((card) => {
            const isClickable = !card.isStatic;
            const isActive = activeFilter === card.key;
            const cardClasses = cn(
              "flex items-center gap-3 p-4 rounded-2xl border border-gray-200 bg-white transition-all dark:border-gray-800 dark:bg-white/[0.03]",
              "w-[140px] sm:w-auto",
              isClickable && "cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700",
              isActive && `ring-2 ${card.ringColor} ring-offset-2 dark:ring-offset-gray-900`
            );

            if (isClickable) {
              return (
                <Link
                  key={card.key}
                  href={card.key === "all" ? basePath : `${basePath}?filter=${card.key}`}
                  className={cardClasses}
                >
                  {renderCardContent(card)}
                </Link>
              );
            }

            return (
              <div key={card.key} className={cardClasses}>
                {renderCardContent(card)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
