"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Phone, Mic, Settings2 } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  updateVapiProviderSettings,
  testVapiConnection,
} from "@/actions/vapi/settings";

interface VapiSettingsFormProps {
  settings: {
    vapiApiKey: string | null;
    vapiPhoneNumberId: string | null;
    vapiPhoneNumber: string | null;
    vapiAssistantId: string | null;
    vapiWebhookSecret: string | null;
    vapiEnabled: boolean;
    azureSpeechKey: string | null;
    azureSpeechRegion: string | null;
    isConfigured: boolean;
  } | null;
}

interface ConnectionTestResult {
  phoneNumbers?: { id: string; number: string }[];
  assistants?: { id: string; name: string }[];
}

export function VapiSettingsForm({ settings }: VapiSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);

  // VAPI API Config
  const [vapiApiKey, setVapiApiKey] = useState(settings?.vapiApiKey || "");
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = useState(settings?.vapiPhoneNumberId || "");
  const [vapiPhoneNumber, setVapiPhoneNumber] = useState(settings?.vapiPhoneNumber || "");
  const [vapiAssistantId, setVapiAssistantId] = useState(settings?.vapiAssistantId || "");
  const [vapiWebhookSecret, setVapiWebhookSecret] = useState(settings?.vapiWebhookSecret || "");
  const [vapiEnabled, setVapiEnabled] = useState(settings?.vapiEnabled || false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);

  // Azure Speech Config (for reference only - configured in VAPI Dashboard)
  const [azureSpeechKey, setAzureSpeechKey] = useState(settings?.azureSpeechKey || "");
  const [azureSpeechRegion, setAzureSpeechRegion] = useState(settings?.azureSpeechRegion || "westeurope");

  const handleSaveApiConfig = () => {
    startTransition(async () => {
      const result = await updateVapiProviderSettings({
        vapiApiKey,
        vapiPhoneNumberId,
        vapiPhoneNumber,
        vapiAssistantId,
        vapiWebhookSecret,
        vapiEnabled,
      });

      if (result.success) {
        toast.success("VAPI API configuration saved successfully");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    });
  };

  const handleSaveAzureConfig = () => {
    startTransition(async () => {
      const result = await updateVapiProviderSettings({
        azureSpeechKey,
        azureSpeechRegion,
      });

      if (result.success) {
        toast.success("Azure Speech configuration saved successfully");
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionResult(null);

    const result = await testVapiConnection();
    setIsTesting(false);

    if (result.success) {
      toast.success(result.message);
      if (result.data) {
        setConnectionResult(result.data);
      }
    } else {
      toast.error(result.error || "Connection test failed");
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setVapiEnabled(enabled);
    setIsTogglingEnabled(true);

    const result = await updateVapiProviderSettings({
      vapiEnabled: enabled,
    });

    setIsTogglingEnabled(false);

    if (result.success) {
      toast.success(enabled ? "VAPI Voice Agent enabled" : "VAPI Voice Agent disabled");
    } else {
      // Revert on error
      setVapiEnabled(!enabled);
      toast.error(result.error || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="size-5" />
                VAPI Voice Agent Status
              </CardTitle>
              <CardDescription>
                Current configuration status for VAPI voice calling
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {settings?.isConfigured ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="mr-1 size-3" />
                  Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <XCircle className="mr-1 size-3" />
                  Not Configured
                </Badge>
              )}
              {vapiEnabled ? (
                <Badge className="bg-green-600">Enabled</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vapi-enabled">Enable VAPI Voice Agent</Label>
              <p className="text-sm text-muted-foreground">
                Allow wedding owners to use voice calling features
              </p>
            </div>
            <Switch
              id="vapi-enabled"
              checked={vapiEnabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isTogglingEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* VAPI API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="size-5" />
            VAPI API Configuration
          </CardTitle>
          <CardDescription>
            Configure your VAPI.ai account credentials. Get these from the VAPI dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vapi-api-key">VAPI API Key (Private Key)</Label>
              <Input
                id="vapi-api-key"
                type="password"
                placeholder="Enter your VAPI API key"
                value={vapiApiKey}
                onChange={(e) => setVapiApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Found in VAPI Dashboard → Settings → API Keys
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vapi-assistant-id">Assistant ID</Label>
              <Input
                id="vapi-assistant-id"
                placeholder="Enter your VAPI assistant ID"
                value={vapiAssistantId}
                onChange={(e) => setVapiAssistantId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Created in VAPI Dashboard → Build → Assistants
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vapi-phone-number-id">Phone Number ID</Label>
              <Input
                id="vapi-phone-number-id"
                placeholder="Enter VAPI phone number ID"
                value={vapiPhoneNumberId}
                onChange={(e) => setVapiPhoneNumberId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Import a Twilio number in VAPI → Settings → Phone Numbers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vapi-phone-number">Display Phone Number</Label>
              <Input
                id="vapi-phone-number"
                placeholder="+972501234567"
                value={vapiPhoneNumber}
                onChange={(e) => setVapiPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The actual phone number (for display purposes)
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="vapi-webhook-secret">Webhook Secret (Optional)</Label>
              <Input
                id="vapi-webhook-secret"
                type="password"
                placeholder="Enter webhook secret for verification"
                value={vapiWebhookSecret}
                onChange={(e) => setVapiWebhookSecret(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Configure in VAPI Dashboard → Settings → Webhooks
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center gap-4">
            <Button
              onClick={handleTestConnection}
              variant="outline"
              disabled={isTesting || !vapiApiKey}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>

            <Button onClick={handleSaveApiConfig} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save API Configuration"
              )}
            </Button>
          </div>

          {/* Connection Test Results */}
          {connectionResult && (
            <Alert className="mt-4">
              <CheckCircle2 className="size-4" />
              <AlertTitle>Connection Successful</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  {connectionResult.phoneNumbers && connectionResult.phoneNumbers.length > 0 && (
                    <div>
                      <strong>Phone Numbers:</strong>
                      <ul className="ml-4 list-disc">
                        {connectionResult.phoneNumbers.map((p) => (
                          <li key={p.id} className="text-sm">
                            {p.number} <span className="text-muted-foreground">({p.id})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {connectionResult.assistants && connectionResult.assistants.length > 0 && (
                    <div>
                      <strong>Assistants:</strong>
                      <ul className="ml-4 list-disc">
                        {connectionResult.assistants.map((a) => (
                          <li key={a.id} className="text-sm">
                            {a.name} <span className="text-muted-foreground">({a.id})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Azure Speech Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="size-5" />
            Azure Speech Configuration
          </CardTitle>
          <CardDescription>
            Configure Azure Speech Services for Hebrew voice synthesis (already integrated in VAPI)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>
              Azure Speech is configured as a voice provider in your VAPI dashboard.
              Store credentials here for reference only. The actual integration is done in VAPI.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="azure-speech-key">Azure Speech Key</Label>
              <Input
                id="azure-speech-key"
                type="password"
                placeholder="Enter Azure Speech key"
                value={azureSpeechKey}
                onChange={(e) => setAzureSpeechKey(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="azure-speech-region">Azure Region</Label>
              <Select value={azureSpeechRegion} onValueChange={setAzureSpeechRegion}>
                <SelectTrigger id="azure-speech-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="westeurope">West Europe</SelectItem>
                  <SelectItem value="northeurope">North Europe</SelectItem>
                  <SelectItem value="eastus">East US</SelectItem>
                  <SelectItem value="westus">West US</SelectItem>
                  <SelectItem value="southeastasia">Southeast Asia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSaveAzureConfig} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Azure Configuration"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Guide</CardTitle>
          <CardDescription>
            Follow these steps to configure VAPI voice agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <strong>Create VAPI Account:</strong> Go to{" "}
              <a
                href="https://dashboard.vapi.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                dashboard.vapi.ai
              </a>{" "}
              and create an account
            </li>
            <li>
              <strong>Add Azure Voice Provider:</strong> In VAPI Settings → Integrations, add Azure as a voice provider with your Azure Speech credentials
            </li>
            <li>
              <strong>Import Phone Number:</strong> In VAPI Settings → Phone Numbers, import a Twilio number (required for Israel +972 numbers)
            </li>
            <li>
              <strong>Create Assistant:</strong> In VAPI Build → Assistants, create a Hebrew assistant with:
              <ul className="ml-6 mt-1 list-disc text-muted-foreground">
                <li>Voice: Azure - he-IL-AvriNeural (male) or he-IL-HilaNeural (female)</li>
                <li>Transcriber: Deepgram - Hebrew (he)</li>
                <li>Model: Azure OpenAI - gpt-4o-mini (recommended) or OpenAI - gpt-4o-mini</li>
              </ul>
            </li>
            <li>
              <strong>Azure OpenAI Setup (Optional but Recommended):</strong>
              <ul className="ml-6 mt-1 list-disc text-muted-foreground">
                <li>Create Azure OpenAI resource in Azure Portal</li>
                <li>Deploy gpt-4o-mini model</li>
                <li>Add Azure OpenAI as provider in VAPI with endpoint + key</li>
              </ul>
            </li>
            <li>
              <strong>Add Custom Tools:</strong> In the assistant settings, add tools for get_wedding_info and update_rsvp pointing to your API endpoints
            </li>
            <li>
              <strong>Configure Webhook:</strong> Set the webhook URL to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                https://your-domain.com/api/vapi/webhook
              </code>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
