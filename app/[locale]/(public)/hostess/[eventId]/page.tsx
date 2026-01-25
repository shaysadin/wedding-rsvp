import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getHostessData } from "@/actions/seating";
import { HostessPageContent } from "@/components/hostess/hostess-page-content";

interface HostessPageProps {
  params: Promise<{ eventId: string; locale: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: HostessPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const result = await getHostessData(eventId);

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
  const result = await getHostessData(eventId);

  if (result.error || !result.event || !result.guests || !result.tables || !result.stats) {
    notFound();
  }

  const { event, guests, tables, stats } = result;
  // Use locale from URL path, fallback to query param, then default to "he"
  const displayLocale = locale || resolvedSearchParams.lang || "he";

  return (
    <HostessPageContent
      eventId={eventId}
      initialEvent={event}
      initialGuests={guests}
      initialTables={tables}
      initialVenueBlocks={result.venueBlocks || []}
      initialStats={stats}
      canvasWidth={event.seatingCanvasWidth || 1200}
      canvasHeight={event.seatingCanvasHeight || 800}
      locale={displayLocale}
    />
  );
}
