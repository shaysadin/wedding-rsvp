import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { getVapiProviderSettings } from "@/actions/vapi/settings";
import { getVapiPhoneNumbers } from "@/actions/vapi/phone-numbers";
import { DashboardHeader } from "@/components/dashboard/header";
import { VapiSettingsForm } from "@/components/admin/vapi-settings-form";

export default async function AdminVapiPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Role check is handled by the admin layout
  if (!user) {
    redirect(`/${locale}/dashboard`);
  }

  const [settingsResult, phoneNumbersResult] = await Promise.all([
    getVapiProviderSettings(),
    getVapiPhoneNumbers(),
  ]);

  const settings = settingsResult.success ? settingsResult.settings : null;
  const phoneNumbers = phoneNumbersResult.success ? phoneNumbersResult.phoneNumbers : [];

  return (
    <>
      <DashboardHeader
        heading="VAPI Voice Agent Settings"
        text="Configure VAPI.ai voice agent for outbound calls to guests."
      />

      <div className="grid gap-6 overflow-auto">
        <VapiSettingsForm settings={settings} phoneNumbers={phoneNumbers} />
      </div>
    </>
  );
}
