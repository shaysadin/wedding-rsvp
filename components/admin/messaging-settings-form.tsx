"use client";

import { useState, useTransition } from "react";
import { MessagingProviderSettings } from "@prisma/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Icons } from "@/components/shared/icons";
import {
  updateMessagingSettings,
  testWhatsAppConnection,
  testSmsConnection,
} from "@/actions/messaging-settings";

interface MessagingSettingsFormProps {
  settings: Partial<MessagingProviderSettings> | null;
}

interface AccountInfo {
  friendlyName: string;
  status: string;
  messagingService?: string;
}

export function MessagingSettingsForm({ settings }: MessagingSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState<"whatsapp" | "sms" | null>(null);
  const [whatsappAccountInfo, setWhatsappAccountInfo] = useState<AccountInfo | null>(null);
  const [smsAccountInfo, setSmsAccountInfo] = useState<AccountInfo | null>(null);

  // WhatsApp state
  const [whatsappProvider, setWhatsappProvider] = useState(settings?.whatsappProvider || "twilio");
  const [whatsappApiKey, setWhatsappApiKey] = useState(settings?.whatsappApiKey || "");
  const [whatsappApiSecret, setWhatsappApiSecret] = useState(settings?.whatsappApiSecret || "");
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState(settings?.whatsappPhoneNumber || "");
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings?.whatsappEnabled || false);

  // WhatsApp Content Template SIDs
  const [whatsappInviteContentSid, setWhatsappInviteContentSid] = useState(settings?.whatsappInviteContentSid || "");
  const [whatsappReminderContentSid, setWhatsappReminderContentSid] = useState(settings?.whatsappReminderContentSid || "");
  const [whatsappConfirmationContentSid, setWhatsappConfirmationContentSid] = useState(settings?.whatsappConfirmationContentSid || "");

  // WhatsApp Template Text (for display to wedding owners)
  const [whatsappInviteTemplateText, setWhatsappInviteTemplateText] = useState(settings?.whatsappInviteTemplateText || "");
  const [whatsappReminderTemplateText, setWhatsappReminderTemplateText] = useState(settings?.whatsappReminderTemplateText || "");
  const [whatsappConfirmationTemplateText, setWhatsappConfirmationTemplateText] = useState(settings?.whatsappConfirmationTemplateText || "");

  // SMS state (Twilio only)
  const smsProvider = "twilio"; // Fixed to Twilio
  const [smsApiKey, setSmsApiKey] = useState(settings?.smsApiKey || "");
  const [smsApiSecret, setSmsApiSecret] = useState(settings?.smsApiSecret || "");
  const [smsPhoneNumber, setSmsPhoneNumber] = useState(settings?.smsPhoneNumber || "");
  const [smsMessagingServiceSid, setSmsMessagingServiceSid] = useState(settings?.smsMessagingServiceSid || "");
  const [smsEnabled, setSmsEnabled] = useState(settings?.smsEnabled || false);

  const handleSaveWhatsApp = () => {
    startTransition(async () => {
      const result = await updateMessagingSettings({
        whatsappProvider,
        whatsappApiKey,
        whatsappApiSecret,
        whatsappPhoneNumber,
        whatsappEnabled,
        whatsappInviteContentSid: whatsappInviteContentSid || null,
        whatsappReminderContentSid: whatsappReminderContentSid || null,
        whatsappConfirmationContentSid: whatsappConfirmationContentSid || null,
        whatsappInviteTemplateText: whatsappInviteTemplateText || null,
        whatsappReminderTemplateText: whatsappReminderTemplateText || null,
        whatsappConfirmationTemplateText: whatsappConfirmationTemplateText || null,
      });

      if (result.success) {
        toast.success("WhatsApp settings saved successfully");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    });
  };

  const handleSaveSms = () => {
    startTransition(async () => {
      const result = await updateMessagingSettings({
        smsProvider,
        smsApiKey,
        smsApiSecret,
        smsPhoneNumber,
        smsMessagingServiceSid: smsMessagingServiceSid || null,
        smsEnabled,
      });

      if (result.success) {
        toast.success("SMS settings saved successfully");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    });
  };

  const handleTestWhatsApp = async () => {
    setIsTesting("whatsapp");
    const result = await testWhatsAppConnection();
    setIsTesting(null);

    if (result.success) {
      toast.success(result.message);
      if (result.accountInfo) {
        setWhatsappAccountInfo(result.accountInfo as AccountInfo);
      }
    } else {
      toast.error(result.error || "Connection test failed");
      setWhatsappAccountInfo(null);
    }
  };

  const handleTestSms = async () => {
    setIsTesting("sms");
    const result = await testSmsConnection();
    setIsTesting(null);

    if (result.success) {
      toast.success(result.message);
      if (result.accountInfo) {
        setSmsAccountInfo(result.accountInfo as AccountInfo);
      }
    } else {
      toast.error(result.error || "Connection test failed");
      setSmsAccountInfo(null);
    }
  };

  // Check if using trial account
  const isTrialAccount = (accountInfo: AccountInfo | null) => {
    if (!accountInfo) return false;
    return accountInfo.status === "active" && accountInfo.friendlyName.toLowerCase().includes("trial");
  };

  return (
    <div className="grid gap-6">
      {/* Twilio Trial Account Warning */}
      {(whatsappProvider === "twilio" || smsProvider === "twilio") && (
        <Alert>
          <Icons.info className="h-4 w-4" />
          <AlertTitle>Twilio Trial Account Limitations</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p className="text-sm">
              If you&apos;re using a Twilio trial account, please note these limitations:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>
                <strong>SMS:</strong> Can only send to{" "}
                <a
                  href="https://console.twilio.com/us1/develop/phone-numbers/manage/verified"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Verified Caller IDs
                </a>
              </li>
              <li>
                <strong>WhatsApp:</strong> Requires{" "}
                <a
                  href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  WhatsApp Sandbox
                </a>{" "}
                - recipients must first message your sandbox number
              </li>
              <li>Messages prefixed with &quot;Sent from your Twilio trial account&quot;</li>
              <li>Limited to ~50 messages per day</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              Upgrade your Twilio account to remove these restrictions for production use.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* WhatsApp Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <Icons.messageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>WhatsApp Configuration</CardTitle>
                <CardDescription>
                  Configure WhatsApp Business API for sending messages
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="whatsapp-enabled" className="text-sm">
                {whatsappEnabled ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="whatsapp-enabled"
                checked={whatsappEnabled}
                onCheckedChange={setWhatsappEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-provider">Provider</Label>
              <Select value={whatsappProvider} onValueChange={setWhatsappProvider}>
                <SelectTrigger id="whatsapp-provider">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="meta">Meta (WhatsApp Business)</SelectItem>
                  <SelectItem value="360dialog">360dialog</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">Phone Number</Label>
              <Input
                id="whatsapp-phone"
                placeholder="+1234567890"
                value={whatsappPhoneNumber}
                onChange={(e) => setWhatsappPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-api-key">API Key / Account SID</Label>
              <Input
                id="whatsapp-api-key"
                type="password"
                placeholder="Enter API key"
                value={whatsappApiKey}
                onChange={(e) => setWhatsappApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-api-secret">API Secret / Auth Token</Label>
              <Input
                id="whatsapp-api-secret"
                type="password"
                placeholder="Enter API secret"
                value={whatsappApiSecret}
                onChange={(e) => setWhatsappApiSecret(e.target.value)}
              />
            </div>
          </div>

          {/* WhatsApp Content Templates Section */}
          <div className="border-t pt-4 mt-4">
            <div className="mb-4">
              <h4 className="text-sm font-medium">Content Templates (Required for WhatsApp Business API)</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Enter your approved Content Template SIDs from{" "}
                <a
                  href="https://console.twilio.com/us1/develop/sms/content-editor/content-templates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Twilio Content API
                </a>
                . Templates must be approved by WhatsApp before use.
              </p>
            </div>
            <div className="grid gap-6">
              {/* Invite Template */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Icons.mail className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium">Invite Template</Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-invite-template" className="text-xs text-muted-foreground">Content SID</Label>
                    <Input
                      id="whatsapp-invite-template"
                      placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={whatsappInviteContentSid}
                      onChange={(e) => setWhatsappInviteContentSid(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-invite-text" className="text-xs text-muted-foreground">Template Text (for display to users)</Label>
                    <Textarea
                      id="whatsapp-invite-text"
                      placeholder="שלום {{1}} 👋&#10;&#10;הוזמנת ל{{2}}! 🎊💍&#10;&#10;לאישור הגעה: {{3}}"
                      value={whatsappInviteTemplateText}
                      onChange={(e) => setWhatsappInviteTemplateText(e.target.value)}
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Variables: {"{{1}}"} = guest name, {"{{2}}"} = event title, {"{{3}}"} = RSVP link
                </p>
              </div>

              {/* Reminder Template */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Icons.bell className="h-4 w-4 text-yellow-600" />
                  <Label className="text-sm font-medium">Reminder Template</Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-reminder-template" className="text-xs text-muted-foreground">Content SID</Label>
                    <Input
                      id="whatsapp-reminder-template"
                      placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={whatsappReminderContentSid}
                      onChange={(e) => setWhatsappReminderContentSid(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-reminder-text" className="text-xs text-muted-foreground">Template Text (for display to users)</Label>
                    <Textarea
                      id="whatsapp-reminder-text"
                      placeholder="היי {{1}} 👋&#10;&#10;עדיין לא קיבלנו את אישור ההגעה שלך ל{{2}} 📋&#10;&#10;לאישור: {{3}}"
                      value={whatsappReminderTemplateText}
                      onChange={(e) => setWhatsappReminderTemplateText(e.target.value)}
                      rows={4}
                      className="text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Variables: {"{{1}}"} = guest name, {"{{2}}"} = event title, {"{{3}}"} = RSVP link
                </p>
              </div>

              {/* Confirmation Template */}
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Icons.check className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-medium">Confirmation Template (Optional)</Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-confirmation-template" className="text-xs text-muted-foreground">Content SID</Label>
                    <Input
                      id="whatsapp-confirmation-template"
                      placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={whatsappConfirmationContentSid}
                      onChange={(e) => setWhatsappConfirmationContentSid(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-confirmation-text" className="text-xs text-muted-foreground">Template Text (for display to users)</Label>
                    <Textarea
                      id="whatsapp-confirmation-text"
                      placeholder="תודה {{1}}! ✅&#10;&#10;קיבלנו את תשובתך ל{{2}}. 🎉"
                      value={whatsappConfirmationTemplateText}
                      onChange={(e) => setWhatsappConfirmationTemplateText(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Variables: {"{{1}}"} = guest name, {"{{2}}"} = event title
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSaveWhatsApp} disabled={isPending}>
              {isPending ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save WhatsApp Settings"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestWhatsApp}
              disabled={isTesting === "whatsapp"}
            >
              {isTesting === "whatsapp" ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Icons.zap className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <Icons.phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>SMS Configuration</CardTitle>
                <CardDescription>
                  Configure SMS provider for sending text messages
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="sms-enabled" className="text-sm">
                {smsEnabled ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id="sms-enabled"
                checked={smsEnabled}
                onCheckedChange={setSmsEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sms-phone">Phone Number</Label>
              <Input
                id="sms-phone"
                placeholder="+1234567890"
                value={smsPhoneNumber}
                onChange={(e) => setSmsPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
                Twilio <span className="ml-2 text-xs text-muted-foreground">(~$0.26/SMS to Israel)</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sms-api-key">Account SID</Label>
              <Input
                id="sms-api-key"
                type="password"
                placeholder="Enter Account SID"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-api-secret">Auth Token</Label>
              <Input
                id="sms-api-secret"
                type="password"
                placeholder="Enter Auth Token"
                value={smsApiSecret}
                onChange={(e) => setSmsApiSecret(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sms-messaging-service">Messaging Service SID (Optional)</Label>
            <Input
              id="sms-messaging-service"
              placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={smsMessagingServiceSid}
              onChange={(e) => setSmsMessagingServiceSid(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If configured, messages will be sent via this Messaging Service instead of the phone number directly.
              This enables Alpha Sender ID, intelligent sender selection, and better deliverability.
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSaveSms} disabled={isPending}>
              {isPending ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save SMS Settings"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestSms}
              disabled={isTesting === "sms"}
            >
              {isTesting === "sms" ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Icons.zap className="mr-2 h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider Status</CardTitle>
          <CardDescription>
            Test your connections to see account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    whatsappEnabled ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    {whatsappEnabled ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              {whatsappAccountInfo && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <p className="text-muted-foreground">
                    Account: <span className="text-foreground">{whatsappAccountInfo.friendlyName}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Status: <span className="text-foreground capitalize">{whatsappAccountInfo.status}</span>
                  </p>
                  {isTrialAccount(whatsappAccountInfo) && (
                    <p className="text-yellow-600 dark:text-yellow-500 mt-1">
                      ⚠ Trial Account
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    smsEnabled ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <div>
                  <p className="font-medium">SMS (Twilio)</p>
                  <p className="text-sm text-muted-foreground">
                    {smsEnabled ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              {smsAccountInfo && (
                <div className="mt-3 pt-3 border-t text-sm">
                  <p className="text-muted-foreground">
                    Account: <span className="text-foreground">{smsAccountInfo.friendlyName}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Status: <span className="text-foreground capitalize">{smsAccountInfo.status}</span>
                  </p>
                  {smsAccountInfo.messagingService && (
                    <p className="text-muted-foreground">
                      Messaging Service: <span className="text-foreground">{smsAccountInfo.messagingService}</span>
                    </p>
                  )}
                  {isTrialAccount(smsAccountInfo) && (
                    <p className="text-yellow-600 dark:text-yellow-500 mt-1">
                      ⚠ Trial Account
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
