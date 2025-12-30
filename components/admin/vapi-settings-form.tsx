"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Phone, Settings2, Plus, Star, Trash2, Users } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  updateVapiProviderSettings,
  testVapiConnection,
} from "@/actions/vapi/settings";
import {
  createVapiPhoneNumber,
  deleteVapiPhoneNumber,
  setDefaultVapiPhoneNumber,
  updateVapiPhoneNumber,
} from "@/actions/vapi/phone-numbers";

interface VapiPhoneNumber {
  id: string;
  phoneNumber: string;
  vapiPhoneId: string;
  displayName: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  _count: { users: number };
}

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
  phoneNumbers?: VapiPhoneNumber[];
}

interface ConnectionTestResult {
  phoneNumbers?: { id: string; number: string }[];
  assistants?: { id: string; name: string }[];
}

export function VapiSettingsForm({ settings, phoneNumbers: initialPhoneNumbers = [] }: VapiSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);

  // Phone Numbers State
  const [phoneNumbers, setPhoneNumbers] = useState(initialPhoneNumbers);
  const [isAddingPhone, setIsAddingPhone] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newVapiPhoneId, setNewVapiPhoneId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);

  // VAPI API Config
  const [vapiApiKey, setVapiApiKey] = useState(settings?.vapiApiKey || "");
  const [vapiAssistantId, setVapiAssistantId] = useState(settings?.vapiAssistantId || "");
  const [vapiWebhookSecret, setVapiWebhookSecret] = useState(settings?.vapiWebhookSecret || "");
  const [vapiEnabled, setVapiEnabled] = useState(settings?.vapiEnabled || false);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);

  const handleSaveApiConfig = () => {
    startTransition(async () => {
      const result = await updateVapiProviderSettings({
        vapiApiKey,
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

  // Phone Number Handlers
  const handleAddPhone = async () => {
    if (!newPhoneNumber || !newVapiPhoneId) {
      toast.error("Phone number and VAPI Phone ID are required");
      return;
    }

    setIsPhoneLoading(true);
    const result = await createVapiPhoneNumber({
      phoneNumber: newPhoneNumber,
      vapiPhoneId: newVapiPhoneId,
      displayName: newDisplayName || undefined,
      isDefault: newIsDefault,
    });
    setIsPhoneLoading(false);

    if (result.success) {
      toast.success("Phone number added");
      setIsAddingPhone(false);
      setNewPhoneNumber("");
      setNewVapiPhoneId("");
      setNewDisplayName("");
      setNewIsDefault(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to add phone number");
    }
  };

  const handleSetDefaultPhone = async (id: string) => {
    setIsPhoneLoading(true);
    const result = await setDefaultVapiPhoneNumber(id);
    setIsPhoneLoading(false);

    if (result.success) {
      toast.success("Default phone number updated");
      setPhoneNumbers(phoneNumbers.map((p) => ({ ...p, isDefault: p.id === id })));
    } else {
      toast.error(result.error || "Failed to set default");
    }
  };

  const handleTogglePhoneActive = async (id: string, isActive: boolean) => {
    setIsPhoneLoading(true);
    const result = await updateVapiPhoneNumber(id, { isActive });
    setIsPhoneLoading(false);

    if (result.success) {
      toast.success(isActive ? "Activated" : "Deactivated");
      setPhoneNumbers(phoneNumbers.map((p) => (p.id === id ? { ...p, isActive } : p)));
    } else {
      toast.error(result.error || "Failed to update");
    }
  };

  const handleDeletePhone = async (id: string) => {
    if (!confirm("Are you sure you want to delete this phone number?")) return;

    setIsPhoneLoading(true);
    const result = await deleteVapiPhoneNumber(id);
    setIsPhoneLoading(false);

    if (result.success) {
      toast.success("Phone number deleted");
      setPhoneNumbers(phoneNumbers.filter((p) => p.id !== id));
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      {/* Phone Numbers Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="size-5" />
                VAPI Phone Numbers
              </CardTitle>
              <CardDescription>
                Manage phone numbers for voice calls. Set a default or assign to users.
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddingPhone(!isAddingPhone)}>
              <Plus className="mr-2 size-4" />
              Add Phone Number
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Form */}
          {isAddingPhone && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    placeholder="+972501234567"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>VAPI Phone ID</Label>
                  <Input
                    placeholder="From VAPI Dashboard"
                    value={newVapiPhoneId}
                    onChange={(e) => setNewVapiPhoneId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name (Optional)</Label>
                  <Input
                    placeholder="e.g., Main Line"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newIsDefault} onCheckedChange={setNewIsDefault} />
                  <Label>Set as Default</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddPhone} disabled={isPhoneLoading}>
                  {isPhoneLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsAddingPhone(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Phone Numbers List */}
          {phoneNumbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="mx-auto mb-4 size-12 text-muted-foreground" />
              <p className="text-muted-foreground">No phone numbers configured yet.</p>
              <p className="text-sm text-muted-foreground">Click &quot;Add Phone Number&quot; to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>VAPI ID</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneNumbers.map((phone) => (
                  <TableRow key={phone.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{phone.phoneNumber}</span>
                        {phone.displayName && (
                          <span className="text-muted-foreground">({phone.displayName})</span>
                        )}
                        {phone.isDefault && (
                          <Badge variant="secondary">
                            <Star className="mr-1 size-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {phone.vapiPhoneId.slice(0, 12)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="size-4 text-muted-foreground" />
                        {phone._count.users}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={phone.isActive}
                        onCheckedChange={(checked) => handleTogglePhoneActive(phone.id, checked)}
                        disabled={isPhoneLoading}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!phone.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefaultPhone(phone.id)}
                            disabled={isPhoneLoading}
                            title="Set as default"
                          >
                            <Star className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePhone(phone.id)}
                          disabled={isPhoneLoading || phone._count.users > 0}
                          title={phone._count.users > 0 ? "Cannot delete: has users" : "Delete"}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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

          <Alert>
            <Phone className="size-4" />
            <AlertTitle>Phone Numbers</AlertTitle>
            <AlertDescription>
              Phone numbers are now managed in the "VAPI Phone Numbers" section above.
              You can add multiple phone numbers and set a default one.
            </AlertDescription>
          </Alert>

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
