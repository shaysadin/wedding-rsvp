"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { updateVapiEventSettings, toggleVapiEventEnabled } from "@/actions/vapi/event-settings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Icons } from "@/components/shared/icons";

interface VoiceAgentSettingsProps {
  eventId: string;
  settings: {
    id: string;
    isEnabled: boolean;
    canUpdateRsvp: boolean;
  } | null;
  onUpdate: () => void;
}

export function VoiceAgentSettings({
  eventId,
  settings,
  onUpdate,
}: VoiceAgentSettingsProps) {
  const t = useTranslations("voiceAgent.settings");

  const [isEnabled, setIsEnabled] = useState(settings?.isEnabled ?? true);
  const [canUpdateRsvp, setCanUpdateRsvp] = useState(settings?.canUpdateRsvp ?? true);

  const handleToggleEnabled = async (enabled: boolean) => {
    setIsEnabled(enabled);
    const result = await toggleVapiEventEnabled(eventId, enabled);
    if (result.error) {
      toast.error(result.error);
      setIsEnabled(!enabled);
    } else {
      toast.success(enabled ? t("enabled") : t("disabled"));
      onUpdate();
    }
  };

  const handleToggleRsvp = async (enabled: boolean) => {
    setCanUpdateRsvp(enabled);
    const result = await updateVapiEventSettings(eventId, {
      canUpdateRsvp: enabled,
    });
    if (result.error) {
      toast.error(result.error);
      setCanUpdateRsvp(!enabled);
    } else {
      onUpdate();
    }
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
            <Icons.settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("title")}</h3>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="voice-agent-enabled" className="text-sm text-muted-foreground">
            {t("enableLabel")}
          </Label>
          <Switch
            id="voice-agent-enabled"
            checked={isEnabled}
            onCheckedChange={handleToggleEnabled}
          />
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* RSVP Update Toggle */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <Icons.checkCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <Label htmlFor="can-update-rsvp" className="font-medium">
                {t("canUpdateRsvp")}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("canUpdateRsvpHint")}
              </p>
            </div>
          </div>
          <Switch
            id="can-update-rsvp"
            checked={canUpdateRsvp}
            onCheckedChange={handleToggleRsvp}
          />
        </div>

        {/* Info about VAPI Dashboard */}
        <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-4">
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
              <Icons.info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-blue-700 dark:text-blue-400 text-sm">
                {t("vapiDashboardNote")}
              </p>
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-300/80">
                {t("vapiDashboardHint")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
