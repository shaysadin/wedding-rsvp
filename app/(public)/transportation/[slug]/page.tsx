import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getGuestByTransportationSlug } from "@/actions/transportation";
import { TransportationForm } from "@/components/transportation/transportation-form";

interface TransportationPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: TransportationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getGuestByTransportationSlug(slug);

  if (result.error || !result.guest) {
    return {
      title: "Transportation Registration",
    };
  }

  return {
    title: `Transportation - ${result.guest.weddingEvent.title}`,
    description: `Register for transportation to ${result.guest.weddingEvent.title}`,
  };
}

export default async function TransportationPage({ params, searchParams }: TransportationPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await getGuestByTransportationSlug(slug);

  if (result.error || !result.guest) {
    notFound();
  }

  const { guest } = result;
  const { weddingEvent } = guest;

  // Determine locale - default to Hebrew, can be overridden with ?lang=en query param
  const locale = resolvedSearchParams.lang || "he";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <TransportationForm
        guest={guest}
        event={weddingEvent}
        existingRegistration={guest.transportationRegistration}
        locale={locale}
      />
    </div>
  );
}
