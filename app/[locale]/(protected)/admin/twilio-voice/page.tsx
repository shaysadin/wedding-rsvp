import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { getTwilioVoiceSettings } from "@/actions/twilio-voice-settings";
import { DashboardHeader } from "@/components/dashboard/header";
import { TwilioVoiceSettingsForm } from "@/components/admin/twilio-voice-settings-form";

export default async function AdminTwilioVoicePage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Role check is handled by the admin layout
  if (!user) {
    redirect(`/${locale}/dashboard`);
  }

  const settingsResult = await getTwilioVoiceSettings();
  const settings = settingsResult.success ? settingsResult.settings : null;

  return (
    <>
      <DashboardHeader
        heading="Twilio Voice (Call Center)"
        text="Configure Twilio Voice API for browser-based calling. Event owners can use the call center to make outbound calls to guests with voice changing capabilities."
      />

      <div className="grid gap-6 overflow-auto">
        <TwilioVoiceSettingsForm settings={settings} />
      </div>
    </>
  );
}
