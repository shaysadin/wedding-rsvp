import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { canAccessEvent } from "@/lib/permissions";
import { DashboardHeader } from "@/components/dashboard/header";
import { CallCenterClient } from "@/components/call-center/call-center-client";
import { getCallCenterGuests, getCallHistory } from "@/actions/call-center";

export default async function CallCenterPage({
  params,
}: {
  params: { eventId: string };
}) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Check access (owner or editor collaborator)
  const hasAccess = await canAccessEvent(params.eventId, user.id, "EDITOR");
  if (!hasAccess) {
    redirect(`/${locale}/dashboard`);
  }

  // Fetch initial data
  const [guestsResult, historyResult] = await Promise.all([
    getCallCenterGuests(params.eventId),
    getCallHistory(params.eventId),
  ]);

  const guests = guestsResult.success ? guestsResult.guests : [];
  const history = historyResult.success ? historyResult.calls : [];

  return (
    <>
      <DashboardHeader
        heading="Call Center"
        text="Make calls to guests using your browser with voice changing capabilities."
      />

      <CallCenterClient
        eventId={params.eventId}
        locale={locale}
        initialGuests={guests}
        initialHistory={history}
      />
    </>
  );
}
