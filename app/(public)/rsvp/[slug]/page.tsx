import { notFound } from "next/navigation";
import { Metadata } from "next";
import { headers } from "next/headers";

import { getGuestBySlug } from "@/actions/rsvp";
import { RsvpForm } from "@/components/rsvp/rsvp-form";
import { RsvpPageWrapper } from "@/components/rsvp/rsvp-page-wrapper";

interface RsvpPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: RsvpPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getGuestBySlug(slug);

  if (result.error || !result.guest) {
    return {
      title: "RSVP",
    };
  }

  return {
    title: `RSVP - ${result.guest.weddingEvent.title}`,
    description: `Please confirm your attendance at ${result.guest.weddingEvent.title}`,
  };
}

export default async function RsvpPage({ params, searchParams }: RsvpPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await getGuestBySlug(slug);

  if (result.error || !result.guest) {
    notFound();
  }

  const { guest } = result;
  const { weddingEvent } = guest;
  const settings = weddingEvent.rsvpPageSettings;

  // Determine locale - use pageLocale from settings, fallback to Hebrew
  // Can be overridden with ?lang=en query param
  const locale = resolvedSearchParams.lang || settings?.pageLocale || "he";

  return (
    <RsvpPageWrapper settings={settings}>
      <RsvpForm
        guest={guest}
        event={weddingEvent}
        existingRsvp={guest.rsvp}
        settings={settings}
        locale={locale}
      />
    </RsvpPageWrapper>
  );
}
