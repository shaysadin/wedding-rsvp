"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  updateTwilioVoiceSettings,
  testTwilioVoiceConnection,
} from "@/actions/twilio-voice-settings";

interface TwilioVoiceSettingsFormProps {
  settings: {
    twilioVoiceAccountSid: string | null;
    twilioVoiceAuthToken: string | null;
    twilioVoiceApiKey: string | null;
    twilioVoiceApiSecret: string | null;
    twilioVoiceTwimlAppSid: string | null;
    twilioVoicePhoneNumber: string | null;
    twilioVoiceEnabled: boolean;
    isConfigured: boolean;
  } | null;
}

export function TwilioVoiceSettingsForm({ settings }: TwilioVoiceSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);

  // Form state
  const [twilioVoiceAccountSid, setTwilioVoiceAccountSid] = useState(settings?.twilioVoiceAccountSid || "");
  const [twilioVoiceAuthToken, setTwilioVoiceAuthToken] = useState(settings?.twilioVoiceAuthToken || "");
  const [twilioVoiceApiKey, setTwilioVoiceApiKey] = useState(settings?.twilioVoiceApiKey || "");
  const [twilioVoiceApiSecret, setTwilioVoiceApiSecret] = useState(settings?.twilioVoiceApiSecret || "");
  const [twilioVoiceTwimlAppSid, setTwilioVoiceTwimlAppSid] = useState(settings?.twilioVoiceTwimlAppSid || "");
  const [twilioVoicePhoneNumber, setTwilioVoicePhoneNumber] = useState(settings?.twilioVoicePhoneNumber || "");
  const [twilioVoiceEnabled, setTwilioVoiceEnabled] = useState(settings?.twilioVoiceEnabled || false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);

  const handleSaveConfig = () => {
    startTransition(async () => {
      const result = await updateTwilioVoiceSettings({
        twilioVoiceAccountSid,
        twilioVoiceAuthToken,
        twilioVoiceApiKey,
        twilioVoiceApiSecret,
        twilioVoiceTwimlAppSid,
        twilioVoicePhoneNumber,
        twilioVoiceEnabled,
      });

      if (result.success) {
        toast.success("Twilio Voice configuration saved successfully");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);

    const result = await testTwilioVoiceConnection();
    setIsTesting(false);

    if (result.success) {
      toast.success(result.message || "Connection test passed");
    } else {
      toast.error(result.error || "Connection test failed");
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setTwilioVoiceEnabled(enabled);
    setIsTogglingEnabled(true);

    const result = await updateTwilioVoiceSettings({
      twilioVoiceEnabled: enabled,
    });

    setIsTogglingEnabled(false);

    if (result.success) {
      toast.success(enabled ? "Twilio Voice enabled" : "Twilio Voice disabled");
    } else {
      // Revert on error
      setTwilioVoiceEnabled(!enabled);
      toast.error(result.error || "Failed to update status");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Twilio Voice (Call Center)</CardTitle>
              <CardDescription>
                Configure Twilio Voice API for browser-based calling in the call center
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings?.isConfigured && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Configured
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Switch */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="twilio-voice-enabled">Enable Twilio Voice</Label>
            <p className="text-sm text-muted-foreground">
              Allow event owners to use the call center feature
            </p>
          </div>
          <Switch
            id="twilio-voice-enabled"
            checked={twilioVoiceEnabled}
            onCheckedChange={handleToggleEnabled}
            disabled={isTogglingEnabled}
          />
        </div>

        {/* Configuration Alert */}
        {!settings?.isConfigured && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              Please configure all settings below to enable the call center feature.
              You'll need to create a TwiML App and API credentials in your Twilio console.
            </AlertDescription>
          </Alert>
        )}

        {/* API Credentials */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">API Credentials</h3>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="twilio-voice-account-sid">Twilio Account SID</Label>
              <Input
                id="twilio-voice-account-sid"
                type="text"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioVoiceAccountSid}
                onChange={(e) => setTwilioVoiceAccountSid(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Found in Twilio Console → Account Info
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twilio-voice-auth-token">Twilio Auth Token</Label>
              <Input
                id="twilio-voice-auth-token"
                type="password"
                placeholder="Enter Auth Token"
                value={twilioVoiceAuthToken}
                onChange={(e) => setTwilioVoiceAuthToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Found in Twilio Console → Account Info (next to Account SID)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twilio-voice-api-key">Twilio API Key (SID)</Label>
              <Input
                id="twilio-voice-api-key"
                type="text"
                placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={twilioVoiceApiKey}
                onChange={(e) => setTwilioVoiceApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Create an API Key in Twilio Console → Account → API Keys
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="twilio-voice-api-secret">Twilio API Secret</Label>
              <Input
                id="twilio-voice-api-secret"
                type="password"
                placeholder="Enter API Secret"
                value={twilioVoiceApiSecret}
                onChange={(e) => setTwilioVoiceApiSecret(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Secret is shown only once when creating the API Key
              </p>
            </div>
          </div>
        </div>

        {/* TwiML App */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">TwiML App Configuration</h3>

          <div className="space-y-2">
            <Label htmlFor="twilio-voice-twiml-app-sid">TwiML App SID</Label>
            <Input
              id="twilio-voice-twiml-app-sid"
              type="text"
              placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={twilioVoiceTwimlAppSid}
              onChange={(e) => setTwilioVoiceTwimlAppSid(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Create a TwiML App in Twilio Console → Voice → TwiML Apps
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twilio-voice-phone-number">Twilio Phone Number</Label>
            <Input
              id="twilio-voice-phone-number"
              type="tel"
              placeholder="+1234567890"
              value={twilioVoicePhoneNumber}
              onChange={(e) => setTwilioVoicePhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Phone number to use as Caller ID for outbound calls
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleSaveConfig}
            disabled={isPending}
            className="flex-1"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>

          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !settings?.isConfigured}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
        </div>

        {/* Setup Instructions */}
        <Alert>
          <AlertTitle>Setup Instructions</AlertTitle>
          <AlertDescription className="space-y-2">
            <p className="text-sm">After saving your configuration:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Go to Twilio Console → Voice → TwiML Apps</li>
              <li>Set Voice Request URL to: <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{`${process.env.NEXT_PUBLIC_APP_URL || 'https://wedinex.com'}/api/twilio-voice/twiml`}</code></li>
              <li>Set Voice Status Callback URL to: <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{`${process.env.NEXT_PUBLIC_APP_URL || 'https://wedinex.com'}/api/twilio-voice/status`}</code></li>
              <li>Set Voice Fallback URL to: <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{`${process.env.NEXT_PUBLIC_APP_URL || 'https://wedinex.com'}/api/twilio-voice/twiml-fallback`}</code> <span className="text-xs text-muted-foreground">(Optional, recommended for production)</span></li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              💡 <strong>Local Development:</strong> Use <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" className="underline">ngrok</a> to expose localhost and update these URLs with your ngrok address during testing.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
