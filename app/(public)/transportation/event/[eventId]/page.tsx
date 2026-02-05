import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getEventForTransportation } from "@/actions/transportation";
import { GenericTransportationForm } from "@/components/transportation/generic-transportation-form";

interface GenericTransportationPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: GenericTransportationPageProps): Promise<Metadata> {
  const { eventId } = await params;
  const result = await getEventForTransportation(eventId);

  if (result.error || !result.event) {
    return {
      title: "Transportation Registration",
    };
  }

  return {
    title: `Transportation - ${result.event.title}`,
    description: `Register for transportation to ${result.event.title}`,
  };
}

export default async function GenericTransportationPage({ params, searchParams }: GenericTransportationPageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await getEventForTransportation(eventId);

  if (result.error || !result.event) {
    notFound();
  }

  const { event } = result;

  // Determine locale - default to Hebrew, can be overridden with ?lang=en query param
  const locale = resolvedSearchParams.lang || "he";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <GenericTransportationForm
        event={event}
        locale={locale}
      />
    </div>
  );
}
