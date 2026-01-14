import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

interface RsvpPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ filter?: string }>;
}

// Redirect RSVP page to unified guests page
// The RSVP customizer is available at /customize
export default async function RsvpPage({ params, searchParams }: RsvpPageProps) {
  const { eventId } = await params;
  const { filter } = await searchParams;
  const locale = await getLocale();

  // Redirect to guests page with same filter if provided
  const filterParam = filter ? `?filter=${filter}` : "";
  redirect(`/${locale}/events/${eventId}/guests${filterParam}`);
}
