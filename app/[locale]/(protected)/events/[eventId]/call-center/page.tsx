import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
import { DashboardHeader } from "@/components/dashboard/header";
import { CallCenterClient } from "@/components/call-center/call-center-client";
import { getCallCenterGuests, getCallHistory } from "@/actions/call-center";
import { prisma } from "@/lib/db";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default async function CallCenterPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const { eventId } = await params;

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check access (owner or editor collaborator)
  const hasAccess = await canAccessEvent(eventId, user.id, "EDITOR");
  if (!hasAccess) {
    redirect(`/${locale}/dashboard`);
  }

  // Check if Twilio Voice is configured
  let isConfigured = false;
  try {
    const settings = await prisma.messagingProviderSettings.findFirst();
    isConfigured = !!(
      settings &&
      (settings as any).twilioVoiceAccountSid &&
      (settings as any).twilioVoiceAuthToken &&
      (settings as any).twilioVoiceApiKey &&
      (settings as any).twilioVoiceApiSecret &&
      (settings as any).twilioVoiceTwimlAppSid &&
      (settings as any).twilioVoiceEnabled
    );
    console.log("[Call Center] Twilio Voice configured:", isConfigured);
  } catch (error) {
    console.error("[Call Center] Error checking Twilio Voice settings:", error);
    isConfigured = false;
  }

  // Fetch initial data
  const [guestsResult, historyResult] = await Promise.all([
    getCallCenterGuests(eventId),
    getCallHistory(eventId),
  ]);

  const guests = guestsResult.success ? guestsResult.guests : [];
  const history = historyResult.success ? historyResult.calls : [];

  const t = await getTranslations("callCenter");

  return (
    <div className="px-3 space-y-2.5 -my-3">
      <DashboardHeader
        heading={t("title")}
        text={t("description")}
      />

      {!isConfigured && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("notConfigured")}</AlertTitle>
          <AlertDescription>
            {t("notConfiguredDescription")}
          </AlertDescription>
        </Alert>
      )}

      <CallCenterClient
        eventId={eventId}
        locale={locale}
        initialGuests={guests}
        initialHistory={history}
        isConfigured={isConfigured}
      />
    </div>
  );
}
