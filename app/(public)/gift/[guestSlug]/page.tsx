import { notFound } from "next/navigation";
import { Metadata } from "next";

import { getGiftSettingsByGuestSlug } from "@/actions/gift-payments";
import { GiftPaymentForm } from "@/components/gifts/gift-payment-form";

interface GiftPageProps {
  params: Promise<{ guestSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params }: GiftPageProps): Promise<Metadata> {
  const { guestSlug } = await params;
  const result = await getGiftSettingsByGuestSlug(guestSlug);

  if (result.error || !result.settings) {
    return {
      title: "Send a Gift",
    };
  }

  return {
    title: `Send a Gift - ${result.eventTitle}`,
    description: `Send a monetary gift for ${result.eventTitle}`,
  };
}

export default async function GiftPage({ params, searchParams }: GiftPageProps) {
  const { guestSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const result = await getGiftSettingsByGuestSlug(guestSlug);

  if (result.error || !result.settings) {
    notFound();
  }

  const { settings, guestName, eventTitle, coupleName } = result;

  // Parse numeric settings from Prisma Decimal
  const parsedSettings = {
    isEnabled: settings.isEnabled,
    minAmount: Number(settings.minAmount),
    maxAmount: Number(settings.maxAmount),
    suggestedAmounts: (settings.suggestedAmounts as number[]) || [100, 250, 500, 1000],
    currency: settings.currency,
  };

  // Check if gifts are enabled
  if (!parsedSettings.isEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">
            {resolvedSearchParams.lang === "en"
              ? "Gift Payments Not Available"
              : "תשלומי מתנות אינם זמינים"}
          </h1>
          <p className="text-muted-foreground">
            {resolvedSearchParams.lang === "en"
              ? "The couple has not enabled gift payments for this event."
              : "בעלי האירוע לא הפעילו אפשרות לשלוח מתנות כספיות."}
          </p>
        </div>
      </div>
    );
  }

  const locale = resolvedSearchParams.lang || "he";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <GiftPaymentForm
        guestSlug={guestSlug}
        guestName={guestName || "Guest"}
        eventTitle={eventTitle || "Event"}
        coupleName={coupleName || "the couple"}
        settings={parsedSettings}
        locale={locale}
      />
    </div>
  );
}
