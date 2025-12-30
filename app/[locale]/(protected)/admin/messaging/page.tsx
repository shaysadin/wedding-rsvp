import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { getMessagingSettings } from "@/actions/messaging-settings";
import { getWhatsAppPhoneNumbersWithUsers } from "@/actions/whatsapp-phone-numbers";
import { DashboardHeader } from "@/components/dashboard/header";
import { MessagingSettingsForm } from "@/components/admin/messaging-settings-form";
import { WhatsAppPhoneNumbersAdmin } from "@/components/admin/whatsapp-phone-numbers-admin";

export default async function AdminMessagingPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Role check is handled by the admin layout
  if (!user) {
    redirect(`/${locale}/dashboard`);
  }

  const [settingsResult, phoneNumbersResult] = await Promise.all([
    getMessagingSettings(),
    getWhatsAppPhoneNumbersWithUsers(),
  ]);

  const settings = settingsResult.success ? settingsResult.settings : null;
  const phoneNumbers = phoneNumbersResult.success ? phoneNumbersResult.phoneNumbers : [];

  return (
    <>
      <DashboardHeader
        heading="Messaging Settings"
        text="Configure WhatsApp and SMS providers for sending notifications to guests."
      />

      <div className="grid gap-6 overflow-auto">
        <WhatsAppPhoneNumbersAdmin phoneNumbers={phoneNumbers} />
        <MessagingSettingsForm settings={settings} />
      </div>
    </>
  );
}
