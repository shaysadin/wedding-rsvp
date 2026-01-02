"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, Users, Image, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { PdfInvitationsEventData } from "@/actions/event-selector";

interface PdfInvitationsEventCardProps {
  event: PdfInvitationsEventData;
  locale: string;
}

export function PdfInvitationsEventCard({ event, locale }: PdfInvitationsEventCardProps) {
  const t = useTranslations("pdfInvitations");
  const router = useRouter();
  const isRTL = locale === "he";

  const { pdfStats } = event;
  const eventDate = new Date(event.dateTime);

  const formattedDate = eventDate.toLocaleDateString(isRTL ? "he-IL" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const handleClick = () => {
    router.push(`/${locale}/dashboard/events/${event.id}/pdf-invitations`);
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 duration-200 cursor-pointer"
      onClick={handleClick}
    >
      {/* Decorative top gradient - Blue/Cyan for PDF invitations */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />

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
            <p className="mt-1 text-xs text-muted-foreground">{formattedDate}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <div className="rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 p-2 dark:from-blue-900/30 dark:to-cyan-900/30 transition-transform duration-150 group-hover:scale-110">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <ChevronRight className={cn(
              "h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1",
              isRTL && "rotate-180 group-hover:-translate-x-1"
            )} />
          </div>
        </div>

        {/* Templates indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 py-3 bg-muted/30 rounded-lg">
          {pdfStats.availableTemplates === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isRTL ? "אין תבניות זמינות" : "No templates available"}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Image className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">
                {isRTL
                  ? `${pdfStats.availableTemplates} תבניות זמינות`
                  : `${pdfStats.availableTemplates} template${pdfStats.availableTemplates > 1 ? 's' : ''} available`}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={cn(
          "mt-4 grid grid-cols-2 gap-2 text-center",
          isRTL && "direction-rtl"
        )}>
          <div className="rounded-md bg-blue-50 p-2 dark:bg-blue-900/20">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {pdfStats.totalGuests}
              </p>
            </div>
            <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
              {isRTL ? "אורחים" : "Guests"}
            </p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
            <div className="flex items-center justify-center gap-1">
              <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {pdfStats.generatedInvitations}
              </p>
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
              {isRTL ? "נוצרו" : "Generated"}
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        {pdfStats.generatedInvitations > 0 && (
          <div className="mt-4">
            <div className={cn(
              "flex items-center justify-between text-xs mb-1",
              isRTL && "flex-row-reverse"
            )}>
              <span className="text-muted-foreground">
                {isRTL ? "הזמנות שנוצרו" : "Invitations generated"}
              </span>
              <span className="font-medium">
                {pdfStats.generatedInvitations}/{pdfStats.totalGuests}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{
                  width: `${pdfStats.totalGuests > 0
                    ? Math.min((pdfStats.generatedInvitations / pdfStats.totalGuests) * 100, 100)
                    : 0}%`
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
