"use client";

import { useState, useTransition } from "react";
import { MessagingProviderSettings } from "@prisma/client";
import { toast } from "sonner";

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

  // SMS state (Twilio or Upsend)
  const [smsProvider, setSmsProvider] = useState<"twilio" | "upsend">(
    (settings?.smsProvider as "twilio" | "upsend") || "twilio"
  );
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

  const isTrialAccount = (accountInfo: AccountInfo | null) => {
    if (!accountInfo) return false;
    return accountInfo.status === "active" && accountInfo.friendlyName.toLowerCase().includes("trial");
  };

  return (
    <div className="grid gap-6">
      {/* Twilio Trial Account Warning */}
      <Alert>
        <Icons.info className="h-4 w-4" />
        <AlertTitle>Twilio Configuration</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p className="text-sm">
            Configure your Twilio credentials for WhatsApp and SMS messaging.
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>
              Get your Account SID and Auth Token from{" "}
              <a
                href="https://console.twilio.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Twilio Console
              </a>
            </li>
            <li>
              WhatsApp requires approved message templates from{" "}
              <a
                href="https://console.twilio.com/us1/develop/sms/content-editor/content-templates"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Content API
              </a>
            </li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* WhatsApp Settings */}
      <Card className="overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                <Icons.messageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>WhatsApp API Credentials</CardTitle>
                <CardDescription>
                  Twilio credentials for WhatsApp Business API
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone">Default Phone Number</Label>
              <Input
                id="whatsapp-phone"
                placeholder="+1234567890"
                value={whatsappPhoneNumber}
                onChange={(e) => setWhatsappPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use Phone Numbers section above for multi-number setup
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-api-key">Account SID</Label>
              <Input
                id="whatsapp-api-key"
                type="password"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={whatsappApiKey}
                onChange={(e) => setWhatsappApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp-api-secret">Auth Token</Label>
              <Input
                id="whatsapp-api-secret"
                type="password"
                placeholder="Your Twilio Auth Token"
                value={whatsappApiSecret}
                onChange={(e) => setWhatsappApiSecret(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-3">
              <Button onClick={handleSaveWhatsApp} disabled={isPending}>
                {isPending ? (
                  <>
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
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
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Icons.zap className="me-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
            {whatsappAccountInfo && (
              <div className="text-sm text-end">
                <p className="text-muted-foreground">
                  {whatsappAccountInfo.friendlyName}
                </p>
                {isTrialAccount(whatsappAccountInfo) && (
                  <p className="text-yellow-600">Trial Account</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SMS Settings */}
      <Card className="overflow-visible">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <Icons.phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>SMS API Credentials</CardTitle>
                <CardDescription>
                  {smsProvider === "twilio"
                    ? "Twilio credentials for SMS messaging"
                    : "Upsend credentials for SMS messaging (Israeli provider)"}
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
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="sms-provider">SMS Provider</Label>
            <Select value={smsProvider} onValueChange={(v) => setSmsProvider(v as "twilio" | "upsend")}>
              <SelectTrigger id="sms-provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio (~$0.26/SMS)</SelectItem>
                <SelectItem value="upsend">Upsend (~₪0.07/SMS - Israeli)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {smsProvider === "twilio" ? (
                <>
                  Get credentials from{" "}
                  <a
                    href="https://console.twilio.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Twilio Console
                  </a>
                </>
              ) : (
                <>
                  Get credentials from{" "}
                  <a
                    href="https://upsend.co.il"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Upsend Dashboard
                  </a>
                </>
              )}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sms-phone">
                {smsProvider === "twilio" ? "Phone Number" : "Sender ID"}
              </Label>
              <Input
                id="sms-phone"
                placeholder={smsProvider === "twilio" ? "+1234567890" : "MySender or 0541234567"}
                value={smsPhoneNumber}
                onChange={(e) => setSmsPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {smsProvider === "upsend"
                  ? "Max 11 characters or phone number (must be whitelisted)"
                  : "Your Twilio phone number"}
              </p>
            </div>
            {smsProvider === "twilio" && (
              <div className="space-y-2">
                <Label htmlFor="sms-messaging-service">Messaging Service SID (Optional)</Label>
                <Input
                  id="sms-messaging-service"
                  placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={smsMessagingServiceSid}
                  onChange={(e) => setSmsMessagingServiceSid(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sms-api-key">
                {smsProvider === "twilio" ? "Account SID" : "Username"}
              </Label>
              <Input
                id="sms-api-key"
                type="password"
                placeholder={smsProvider === "twilio" ? "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" : "Your Upsend username"}
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-api-secret">
                {smsProvider === "twilio" ? "Auth Token" : "API Token"}
              </Label>
              <Input
                id="sms-api-secret"
                type="password"
                placeholder={smsProvider === "twilio" ? "Your Twilio Auth Token" : "Your Upsend API Token"}
                value={smsApiSecret}
                onChange={(e) => setSmsApiSecret(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-3">
              <Button onClick={handleSaveSms} disabled={isPending}>
                {isPending ? (
                  <>
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
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
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Icons.zap className="me-2 h-4 w-4" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
            {smsAccountInfo && (
              <div className="text-sm text-end">
                <p className="text-muted-foreground">
                  {smsAccountInfo.friendlyName}
                </p>
                {isTrialAccount(smsAccountInfo) && (
                  <p className="text-yellow-600">Trial Account</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
