import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { UserRole } from "@prisma/client";

import { getCurrentUser } from "@/lib/session";
import { getMessagingSettings } from "@/actions/messaging-settings";
import { DashboardHeader } from "@/components/dashboard/header";
import { MessagingSettingsForm } from "@/components/admin/messaging-settings-form";

export default async function AdminMessagingPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user || user.role !== UserRole.ROLE_PLATFORM_OWNER) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getMessagingSettings();
  const settings = result.success ? result.settings : null;

  return (
    <>
      <DashboardHeader
        heading="Messaging Settings"
        text="Configure WhatsApp and SMS providers for sending notifications to guests."
      />

      <div className="grid gap-6  overflow-auto">
        <MessagingSettingsForm settings={settings} />
      </div>
    </>
  );
}
