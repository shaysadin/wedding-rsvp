import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { getMessagingSettings } from "@/actions/messaging-settings";
import { getWhatsAppPhoneNumbersWithUsers } from "@/actions/whatsapp-phone-numbers";
import { getAllWhatsAppTemplates } from "@/actions/whatsapp-templates";
import { DashboardHeader } from "@/components/dashboard/header";
import { MessagingSettingsForm } from "@/components/admin/messaging-settings-form";
import { WhatsAppPhoneNumbersAdmin } from "@/components/admin/whatsapp-phone-numbers-admin";
import { WhatsAppTemplatesAdmin } from "@/components/admin/whatsapp-templates-admin";

export default async function AdminMessagingPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Role check is handled by the admin layout
  if (!user) {
    redirect(`/${locale}/dashboard`);
  }

  const [settingsResult, phoneNumbersResult, templatesResult] = await Promise.all([
    getMessagingSettings(),
    getWhatsAppPhoneNumbersWithUsers(),
    getAllWhatsAppTemplates(),
  ]);

  const settings = settingsResult.success ? settingsResult.settings : null;
  const phoneNumbers = phoneNumbersResult.success ? phoneNumbersResult.phoneNumbers : [];
  const templates = templatesResult.success ? templatesResult.templates : [];

  return (
    <>
      <DashboardHeader
        heading="Messaging Settings"
        text="Configure WhatsApp and SMS providers, phone numbers, and message templates."
      />

      <div className="space-y-8">
        {/* Section 1: API Credentials */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
            API Credentials
          </h2>
          <MessagingSettingsForm settings={settings} />
        </section>

        {/* Section 2: Phone Numbers */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
            Phone Numbers
          </h2>
          <WhatsAppPhoneNumbersAdmin phoneNumbers={phoneNumbers} />
        </section>

        {/* Section 3: WhatsApp Templates */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
            WhatsApp Message Templates
          </h2>
          <WhatsAppTemplatesAdmin templates={templates as any} />
        </section>
      </div>
    </>
  );
}
