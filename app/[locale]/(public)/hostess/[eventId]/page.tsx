import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getEventGuestsForHostess } from "@/actions/seating";
import { HostessGuestTable } from "@/components/hostess/hostess-guest-table";

interface HostessPageProps {
  params: Promise<{ eventId: string; locale: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: HostessPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const result = await getEventGuestsForHostess(eventId);

  if (result.error || !result.event) {
    return {
      title: "Guest List",
    };
  }

  return {
    title: `Guest List - ${result.event.title}`,
    description: `Guest list for ${result.event.title}`,
  };
}

export default async function HostessPage({ params, searchParams }: HostessPageProps) {
  const { eventId, locale } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await getEventGuestsForHostess(eventId);

  if (result.error || !result.event || !result.guests) {
    notFound();
  }

  const { event, guests } = result;
  // Use locale from URL path, fallback to query param, then default to "he"
  const displayLocale = locale || resolvedSearchParams.lang || "he";
  const isRTL = displayLocale === "he";

  return (
    <div
      className="min-h-screen bg-background"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
          <p className="text-muted-foreground">
            {new Date(event.dateTime).toLocaleDateString(displayLocale, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {event.venue && (
            <p className="text-muted-foreground">{event.venue}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            {isRTL ? `${guests.length} אורחים מאושרים` : `${guests.length} confirmed guests`}
          </p>
        </div>

        {/* Guest Table */}
        <HostessGuestTable guests={guests} locale={displayLocale} />
      </div>
    </div>
  );
}
