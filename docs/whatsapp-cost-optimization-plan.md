# WhatsApp Cost Optimization Plan

**Created:** January 2026
**Status:** Planning Phase
**Priority:** High (Cost savings of 69-94% per event)

---

## Executive Summary

This plan outlines a comprehensive strategy to reduce WhatsApp messaging costs from **$0.091 per message** (marketing templates in Israel) to as low as **$0.005 per message** (Twilio fee only during free windows). The optimization focuses on:

1. **Twilio Template Management Integration** - Enable in-app template creation and management
2. **Template Category Optimization** - Reclassify applicable templates from Marketing to Utility
3. **Service Window Tracking** - Leverage 24-hour free messaging windows
4. **Click-to-WhatsApp Ads** - Implement 72-hour free messaging entry points

**Estimated Cost Savings:**
- Current: $77.35 per 200-guest wedding
- Optimized: $24.08 per wedding (69% reduction)
- With CTWA Ads: $5.00 per wedding (94% reduction)

---

## Part 1: Twilio Content Template Management Integration

### Current State

**Template Management Process:**
- Templates are manually created in Twilio Console
- Content SIDs are manually copied to database via Admin UI
- No integration between app and Twilio Content API
- Template definitions stored in `config/whatsapp-templates.ts`
- Database storage in `WhatsAppTemplate` model

**Current Architecture:**
```
Twilio Console → Manual Copy → Admin UI → Database (WhatsAppTemplate)
                                    ↓
                            Template Selection in App
```

**Pain Points:**
1. Manual process prone to errors
2. Content SID copy-paste mistakes
3. Cannot preview templates in Twilio from app
4. No sync mechanism for template status
5. Cannot create templates directly from app
6. No visibility into Twilio approval status

### Goal

Enable seamless template management directly within the application:
- Create templates in Twilio from app UI
- Sync template status (pending, approved, rejected)
- Preview templates before sending
- Manage template categories (Marketing vs Utility)
- Update template content without leaving app

### Technical Implementation

#### 1.1 Twilio Content API Integration

**Files to Create:**
- `lib/twilio/content-api.ts` - Twilio Content API wrapper
- `lib/twilio/template-sync.ts` - Sync templates with database
- `actions/twilio-templates.ts` - Server actions for template operations

**API Capabilities:**
```typescript
// lib/twilio/content-api.ts

import Twilio from "twilio";

export interface TwilioContentTemplate {
  sid: string;
  friendlyName: string;
  language: string;
  variables: Record<string, string>;
  types: {
    "twilio/text": {
      body: string;
    };
    "twilio/media"?: {
      body: string;
      media: string[];
    };
    "twilio/quick-reply"?: {
      body: string;
      actions: Array<{
        id: string;
        title: string;
      }>;
    };
    "twilio/call-to-action"?: {
      body: string;
      actions: Array<{
        title: string;
        url: string;
        id: string;
      }>;
    };
  };
}

export interface CreateTemplateInput {
  friendlyName: string;
  language: string; // "he", "en"
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION"; // WhatsApp category
  body: string;
  variables?: string[]; // ["1", "2", "3"] for {{1}}, {{2}}, {{3}}
  buttons?: Array<{
    type: "quick_reply" | "url";
    text: string;
    payload?: string; // for quick_reply
    url?: string; // for url buttons
  }>;
  media?: string[]; // URLs for images/videos
}

export class TwilioContentAPI {
  private client: Twilio.Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = Twilio(accountSid, authToken);
  }

  /**
   * Create a new content template
   * https://www.twilio.com/docs/content/content-api-resources#create-a-contentresource
   */
  async createTemplate(input: CreateTemplateInput): Promise<{
    success: boolean;
    contentSid?: string;
    error?: string;
  }> {
    try {
      // Build content types based on template features
      const types: any = {
        "twilio/text": {
          body: input.body,
        },
      };

      // Add media if provided
      if (input.media && input.media.length > 0) {
        types["twilio/media"] = {
          body: input.body,
          media: input.media,
        };
      }

      // Add buttons if provided
      if (input.buttons && input.buttons.length > 0) {
        const quickReplyButtons = input.buttons.filter(b => b.type === "quick_reply");
        const urlButtons = input.buttons.filter(b => b.type === "url");

        if (quickReplyButtons.length > 0) {
          types["twilio/quick-reply"] = {
            body: input.body,
            actions: quickReplyButtons.map(b => ({
              id: b.payload || b.text.toLowerCase().replace(/\s+/g, "_"),
              title: b.text,
            })),
          };
        }

        if (urlButtons.length > 0) {
          types["twilio/call-to-action"] = {
            body: input.body,
            actions: urlButtons.map((b, idx) => ({
              title: b.text,
              url: b.url || "",
              id: `url_${idx}`,
            })),
          };
        }
      }

      // Detect variables in body ({{1}}, {{2}}, etc.)
      const detectedVariables = this.extractVariables(input.body);
      const variables = input.variables || detectedVariables;

      const content = await this.client.content.v1.contents.create({
        friendlyName: input.friendlyName,
        language: input.language,
        variables: variables.reduce((acc, v) => {
          acc[v] = `{{${v}}}`;
          return acc;
        }, {} as Record<string, string>),
        types,
      });

      // Note: After creating, template needs WhatsApp approval
      // Status will be "received" or "approved" in content.approvalRequests

      return {
        success: true,
        contentSid: content.sid,
      };
    } catch (error: any) {
      console.error("Error creating Twilio content template:", error);
      return {
        success: false,
        error: error.message || "Failed to create template",
      };
    }
  }

  /**
   * Get template details by Content SID
   */
  async getTemplate(contentSid: string): Promise<{
    success: boolean;
    template?: TwilioContentTemplate;
    approvalStatus?: "approved" | "pending" | "rejected";
    error?: string;
  }> {
    try {
      const content = await this.client.content.v1.contents(contentSid).fetch();

      // Check WhatsApp approval status
      // approval_fetch is an array with status for each channel
      const approvalRequests = await this.client.content.v1
        .contents(contentSid)
        .approvalFetch()
        .list();

      const whatsappApproval = approvalRequests.find(
        (a: any) => a.whatsapp
      );

      const approvalStatus = whatsappApproval?.whatsapp?.status || "pending";

      return {
        success: true,
        template: content as any,
        approvalStatus,
      };
    } catch (error: any) {
      console.error("Error fetching Twilio content template:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch template",
      };
    }
  }

  /**
   * List all content templates
   */
  async listTemplates(): Promise<{
    success: boolean;
    templates?: TwilioContentTemplate[];
    error?: string;
  }> {
    try {
      const contents = await this.client.content.v1.contents.list();

      return {
        success: true,
        templates: contents as any[],
      };
    } catch (error: any) {
      console.error("Error listing Twilio content templates:", error);
      return {
        success: false,
        error: error.message || "Failed to list templates",
      };
    }
  }

  /**
   * Delete a content template
   */
  async deleteTemplate(contentSid: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await this.client.content.v1.contents(contentSid).remove();

      return { success: true };
    } catch (error: any) {
      console.error("Error deleting Twilio content template:", error);
      return {
        success: false,
        error: error.message || "Failed to delete template",
      };
    }
  }

  /**
   * Extract variable placeholders from template body
   * Matches {{1}}, {{2}}, {{3}}, etc.
   */
  private extractVariables(body: string): string[] {
    const regex = /\{\{(\d+)\}\}/g;
    const matches = body.matchAll(regex);
    const variables = new Set<string>();

    for (const match of matches) {
      variables.add(match[1]);
    }

    return Array.from(variables).sort();
  }

  /**
   * Submit template for WhatsApp approval
   * Note: This happens automatically when creating content,
   * but can also be done manually
   */
  async submitForApproval(contentSid: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Submit for WhatsApp approval
      await this.client.content.v1
        .contents(contentSid)
        .approvalCreate()
        .create({
          name: "whatsapp",
        });

      return { success: true };
    } catch (error: any) {
      console.error("Error submitting template for approval:", error);
      return {
        success: false,
        error: error.message || "Failed to submit for approval",
      };
    }
  }
}

/**
 * Get Twilio Content API client from settings
 */
export async function getTwilioContentClient(): Promise<TwilioContentAPI | null> {
  const { prisma } = await import("@/lib/db");

  const settings = await prisma.messagingProviderSettings.findFirst();

  if (!settings?.whatsappApiKey || !settings?.whatsappApiSecret) {
    return null;
  }

  return new TwilioContentAPI(
    settings.whatsappApiKey,
    settings.whatsappApiSecret
  );
}
```

#### 1.2 Template Sync Service

**File:** `lib/twilio/template-sync.ts`

```typescript
/**
 * Sync Twilio content templates with local database
 */

import { prisma } from "@/lib/db";
import { getTwilioContentClient } from "./content-api";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";

export async function syncTemplatesFromTwilio(): Promise<{
  success: boolean;
  synced?: number;
  error?: string;
}> {
  try {
    const client = await getTwilioContentClient();
    if (!client) {
      return { success: false, error: "Twilio client not configured" };
    }

    // Fetch all templates from Twilio
    const result = await client.listTemplates();
    if (!result.success || !result.templates) {
      return { success: false, error: result.error };
    }

    let syncedCount = 0;

    // Match templates with local database by Content SID
    for (const twilioTemplate of result.templates) {
      const localTemplate = await prisma.whatsAppTemplate.findFirst({
        where: { contentSid: twilioTemplate.sid },
      });

      if (localTemplate) {
        // Get approval status
        const details = await client.getTemplate(twilioTemplate.sid);

        // Update template with latest info
        await prisma.whatsAppTemplate.update({
          where: { id: localTemplate.id },
          data: {
            templateText: twilioTemplate.types["twilio/text"]?.body,
            // Store approval status in a new field or notes
            updatedAt: new Date(),
          },
        });

        syncedCount++;
      }
    }

    return { success: true, synced: syncedCount };
  } catch (error: any) {
    console.error("Error syncing templates:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check approval status for a specific template
 */
export async function checkTemplateApprovalStatus(contentSid: string): Promise<{
  success: boolean;
  status?: "approved" | "pending" | "rejected";
  error?: string;
}> {
  try {
    const client = await getTwilioContentClient();
    if (!client) {
      return { success: false, error: "Twilio client not configured" };
    }

    const result = await client.getTemplate(contentSid);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      status: result.approvalStatus,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

#### 1.3 Server Actions for Template Management

**File:** `actions/twilio-templates.ts`

```typescript
"use server";

import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getTwilioContentClient, CreateTemplateInput } from "@/lib/twilio/content-api";
import { syncTemplatesFromTwilio } from "@/lib/twilio/template-sync";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";

export async function createTwilioTemplate(input: {
  type: WhatsAppTemplateType;
  style: string;
  nameHe: string;
  nameEn: string;
  templateBody: string;
  language: "he" | "en";
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  buttons?: Array<{
    type: "quick_reply" | "url";
    text: string;
    payload?: string;
    url?: string;
  }>;
  media?: string[];
}) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    // Get Twilio client
    const client = await getTwilioContentClient();
    if (!client) {
      return { success: false, error: "Twilio not configured" };
    }

    // Create template in Twilio
    const friendlyName = `${input.type.toLowerCase()}_${input.style}_${input.language}`;

    const result = await client.createTemplate({
      friendlyName,
      language: input.language,
      category: input.category,
      body: input.templateBody,
      buttons: input.buttons,
      media: input.media,
    });

    if (!result.success || !result.contentSid) {
      return { success: false, error: result.error };
    }

    // Save to database
    const template = await prisma.whatsAppTemplate.create({
      data: {
        type: input.type as any,
        style: input.style,
        nameHe: input.nameHe,
        nameEn: input.nameEn,
        contentSid: result.contentSid,
        templateText: input.templateBody,
        isActive: false, // Will be activated after WhatsApp approval
        sortOrder: 0,
      },
    });

    revalidatePath("/admin/messaging");

    return {
      success: true,
      template,
      contentSid: result.contentSid,
      message: "Template created. Awaiting WhatsApp approval (can take 24-48 hours).",
    };
  } catch (error: any) {
    console.error("Error creating Twilio template:", error);
    return { success: false, error: error.message || "Failed to create template" };
  }
}

export async function syncTemplatesAction() {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    const result = await syncTemplatesFromTwilio();

    revalidatePath("/admin/messaging");

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkTemplateApproval(contentSid: string) {
  try {
    const user = await getCurrentUser();

    if (!user?.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await getTwilioContentClient();
    if (!client) {
      return { success: false, error: "Twilio not configured" };
    }

    const result = await client.getTemplate(contentSid);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Update database if approved
    if (result.approvalStatus === "approved") {
      await prisma.whatsAppTemplate.updateMany({
        where: { contentSid },
        data: { isActive: true },
      });

      revalidatePath("/admin/messaging");
    }

    return {
      success: true,
      status: result.approvalStatus,
      template: result.template,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

#### 1.4 Admin UI Updates

**File:** `components/admin/twilio-template-creator.tsx`

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createTwilioTemplate } from "@/actions/twilio-templates";
import type { WhatsAppTemplateType, WhatsAppTemplateStyle } from "@/config/whatsapp-templates";

export function TwilioTemplateCreator() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<WhatsAppTemplateType>("INVITE");
  const [style, setStyle] = useState<WhatsAppTemplateStyle>("formal");
  const [language, setLanguage] = useState<"he" | "en">("he");
  const [category, setCategory] = useState<"MARKETING" | "UTILITY" | "AUTHENTICATION">("MARKETING");
  const [nameHe, setNameHe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const handleCreate = async () => {
    setLoading(true);

    try {
      const result = await createTwilioTemplate({
        type,
        style,
        nameHe,
        nameEn,
        templateBody,
        language,
        category,
      });

      if (result.success) {
        toast.success(result.message || "Template created successfully");
        setOpen(false);
        // Reset form
        setTemplateBody("");
        setNameHe("");
        setNameEn("");
      } else {
        toast.error(result.error || "Failed to create template");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Create New Template in Twilio
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create WhatsApp Template in Twilio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Type */}
            <div>
              <Label>Template Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as WhatsAppTemplateType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVITE">Invitation</SelectItem>
                  <SelectItem value="REMINDER">Reminder</SelectItem>
                  <SelectItem value="CONFIRMATION">Confirmation</SelectItem>
                  <SelectItem value="TABLE_ASSIGNMENT">Table Assignment</SelectItem>
                  <SelectItem value="EVENT_DAY">Event Day</SelectItem>
                  <SelectItem value="THANK_YOU">Thank You</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Style */}
            <div>
              <Label>Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as WhatsAppTemplateStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category - IMPORTANT for cost! */}
            <div>
              <Label>WhatsApp Category (affects pricing!)</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">
                    Marketing ($0.086/msg) - Invitations, promotions
                  </SelectItem>
                  <SelectItem value="UTILITY">
                    Utility ($0.014/msg) - Confirmations, updates
                  </SelectItem>
                  <SelectItem value="AUTHENTICATION">
                    Authentication ($0.014/msg) - OTP, verification
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Utility is 6x cheaper but must be transactional (no promotional content)
              </p>
            </div>

            {/* Language */}
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as "he" | "en")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="he">עברית (Hebrew)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Names */}
            <div>
              <Label>Name (Hebrew)</Label>
              <Input value={nameHe} onChange={(e) => setNameHe(e.target.value)} />
            </div>

            <div>
              <Label>Name (English)</Label>
              <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>

            {/* Template Body */}
            <div>
              <Label>Template Body</Label>
              <Textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                rows={8}
                placeholder="Use {{1}} for guest name, {{2}} for event title, {{3}} for link..."
              />
              <p className="text-sm text-muted-foreground mt-1">
                Variables: {`{{1}}=guest name, {{2}}=event title, {{3}}=link/data`}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Create Template"}
              </Button>
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md text-sm">
              <p className="font-medium mb-2">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Template will be created in Twilio and submitted for WhatsApp approval</li>
                <li>Approval typically takes 24-48 hours</li>
                <li>UTILITY templates must be transactional (no marketing content)</li>
                <li>Once approved, template will be automatically activated</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

#### 1.5 Database Schema Updates

**File:** `prisma/schema.prisma` (additions)

```prisma
model WhatsAppTemplate {
  // ... existing fields ...

  // NEW FIELDS for Twilio integration
  approvalStatus    String?  @default("pending") @map("approval_status") // "pending", "approved", "rejected"
  twilioFriendlyName String? @map("twilio_friendly_name") // Template name in Twilio
  lastSyncedAt      DateTime? @map("last_synced_at") // Last time synced with Twilio

  // ... rest of model
}
```

---

## Part 2: Current Template Setup Review

### Objective
Audit all existing WhatsApp templates to identify optimization opportunities.

### Current Templates Inventory

Based on `config/whatsapp-templates.ts` and database schema:

#### Existing Approved Templates (Formal Style)

| Type | Name | Content SID | Category | Cost (Israel) |
|------|------|-------------|----------|---------------|
| INVITE | Wedding Invitation | HX1a4aaf40cf5f7fd8a9a36f5c83226bd3 | **MARKETING** | **$0.086** |
| REMINDER | Wedding Reminder | HXb9855ad5e6b9797f3195574a090417ac | **MARKETING** | **$0.086** |
| INTERACTIVE_INVITE | Interactive Invite Card | HXff76515d76bbe3e50656ef59bdf90fc6 | **MARKETING** | **$0.086** |
| IMAGE_INVITE | Image Invite | HXff76515d76bbe3e50656ef59bdf90fc6 | **MARKETING** | **$0.086** |
| INTERACTIVE_REMINDER | Interactive Reminder | HXba2294e9683d133dfe92c62692e9d3f2 | **MARKETING** | **$0.086** |
| EVENT_DAY | Event Day Reminder | HX80e0ff2024fb29d65878e002df31afd3 | **MARKETING?** | **$0.086** |
| THANK_YOU | Thank You Message | HX2e0cc26147f657e88a902b48349158b7 | **MARKETING** | **$0.086** |
| GUEST_COUNT_LIST | Guest Count List | HX4322c2482da4bce43d001668b83234a6 | **MARKETING?** | **$0.086** |

#### Missing Templates

| Type | Status | Priority |
|------|--------|----------|
| CONFIRMATION | Not configured | **HIGH** (can be UTILITY) |
| TABLE_ASSIGNMENT | Uses free-form message | **HIGH** (can be UTILITY) |

### Templates That Can Be Reclassified as UTILITY

Based on WhatsApp's guidelines, the following can be **UTILITY** templates:

#### ✅ CONFIRMATION Template
**Current:** Not configured
**Should Be:** UTILITY template ($0.014 vs $0.086)
**Justification:**
- Sent after guest RSVPs (transactional)
- Confirms an action the user already took
- No promotional content, just confirmation

**Template Example:**
```
שלום {{1}},

אישור הגעה ל{{2}} התקבל בהצלחה.

מספר אורחים: {{3}}
תאריך: {{4}}
מיקום: {{5}}

נשמח לראותכם!
```

**Action Required:**
1. Create as UTILITY category in Twilio
2. Get WhatsApp approval
3. Add to database

#### ✅ TABLE_ASSIGNMENT Template
**Current:** Uses free-form message (requires 24h window)
**Should Be:** UTILITY template ($0.014 vs $0.086)
**Justification:**
- Assignment notification (transactional)
- Related to confirmed RSVP (prior transaction)
- No promotional content

**Template Example:**
```
שלום {{1}},

שובצת לשולחן {{2}} באירוע {{3}}.

תאריך: {{4}}
שעה: {{5}}
מיקום: {{6}}

נתראה שם!
```

**Action Required:**
1. Create as UTILITY category in Twilio
2. Get WhatsApp approval
3. Update `lib/notifications/real-service.ts` to use template instead of free-form

#### ✅ EVENT_DAY Template
**Current:** MARKETING (HX80e0ff2024fb29d65878e002df31afd3)
**Should Be:** UTILITY template
**Justification:**
- Sent to confirmed guests only
- Time-sensitive operational reminder
- Provides event details (address, time, table)
- Related to prior RSVP transaction

**Template Example (current):**
```
שלום {{1}},

היום הגיע! {{2}} מתקיים היום.

שולחן: {{3}}
שעה: {{4}}
כתובת: {{5}}

{{6}} (gift link if applicable)

נתראה בקרוב!
```

**Action Required:**
1. Create NEW version as UTILITY category
2. Get WhatsApp approval
3. Replace marketing version with utility version
4. **Savings:** $0.072 per message

#### ❌ Cannot Be UTILITY (Must Stay MARKETING)

| Template | Reason |
|----------|--------|
| INVITE | Initial invitation = promotional |
| REMINDER | Not tied to specific transaction |
| INTERACTIVE_INVITE | Promotional invitation |
| INTERACTIVE_REMINDER | Promotional reminder |
| IMAGE_INVITE | Promotional with media |
| THANK_YOU | Post-event message, no transaction |
| GUEST_COUNT_LIST | Request for info, no prior transaction |

### Review Action Items

**Tasks:**
1. ✅ Audit all template content for category appropriateness
2. ✅ Identify templates that can be reclassified
3. ✅ Create list of new templates needed
4. ✅ Document template usage patterns from `NotificationLog`
5. ⬜ Analyze cost per template type (see Part 4)

**SQL Query for Template Usage Analysis:**
```sql
-- Count messages by type and channel
SELECT
  type,
  channel,
  status,
  COUNT(*) as message_count,
  COUNT(*) * 0.086 as estimated_cost_marketing,
  COUNT(*) * 0.014 as estimated_cost_utility,
  COUNT(*) * (0.086 - 0.014) as potential_savings
FROM notification_logs
WHERE channel = 'WHATSAPP'
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY type, channel, status
ORDER BY message_count DESC;
```

---

## Part 3: Service Window Tracking Implementation

### Objective
Track 24-hour service windows to send free messages when guests initiate conversations.

### Current State

**Incoming Message Handling:**
- Webhook: `app/api/twilio/whatsapp/route.ts`
- Handles button responses and list selections
- Does NOT track regular incoming messages
- No service window tracking

**Notification Sending:**
- Service: `lib/notifications/real-service.ts`
- No check for active service window
- Always uses templates (paid)

### WhatsApp Service Window Rules

**Free Messaging Window:**
1. User messages business first → Opens 24-hour window
2. During 24 hours: Send unlimited free-form messages (no template needed)
3. During 24 hours: UTILITY templates are also FREE (as of April 2025)
4. Each new user message resets the 24-hour timer
5. After 24 hours: Must use paid templates

**Cost Comparison:**
- Free-form message in service window: **$0.005** (Twilio fee only)
- Utility template in service window: **$0.005** (Twilio fee only)
- Utility template outside window: **$0.019** (Meta + Twilio)
- Marketing template: **$0.091** (Meta + Twilio)

### Implementation Plan

#### 3.1 Database Schema Updates

**File:** `prisma/schema.prisma`

```prisma
model Guest {
  // ... existing fields ...

  // NEW FIELDS for service window tracking
  lastUserMessageAt     DateTime? @map("last_user_message_at")
  serviceWindowExpiresAt DateTime? @map("service_window_expires_at")
  totalUserMessages     Int       @default(0) @map("total_user_messages")

  // ... existing relations ...
}

// NEW MODEL: Track all incoming messages for analytics
model IncomingMessage {
  id              String   @id @default(cuid())
  guestId         String?  @map("guest_id")
  phoneNumber     String   @map("phone_number")
  messageBody     String?  @map("message_body")
  twilioMessageSid String? @map("twilio_message_sid")
  messageType     String?  @map("message_type") // "text", "button", "list", "media"
  receivedAt      DateTime @default(now()) @map("received_at")

  guest           Guest?   @relation(fields: [guestId], references: [id], onDelete: SetNull)

  @@index([guestId])
  @@index([phoneNumber])
  @@index([receivedAt])
  @@map("incoming_messages")
}

// Update Guest model to include relation
model Guest {
  // ... existing fields ...
  incomingMessages IncomingMessage[]
  // ... rest of model
}
```

#### 3.2 Service Window Utilities

**File:** `lib/notifications/service-window.ts`

```typescript
/**
 * Service Window Tracking Utilities
 *
 * WhatsApp provides a 24-hour free messaging window when a user messages first.
 * During this window:
 * - Free-form messages are free (only Twilio $0.005 fee)
 * - Utility templates are free (only Twilio $0.005 fee)
 * - Marketing templates still cost full price ($0.091)
 */

import { prisma } from "@/lib/db";
import { Guest } from "@prisma/client";

const SERVICE_WINDOW_HOURS = 24;

export interface ServiceWindowStatus {
  isActive: boolean;
  expiresAt: Date | null;
  hoursRemaining: number | null;
  canUseFreeForm: boolean;
  canUseFreeUtility: boolean;
}

/**
 * Check if guest is within 24-hour service window
 */
export async function getServiceWindowStatus(
  guestId: string
): Promise<ServiceWindowStatus> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: {
      lastUserMessageAt: true,
      serviceWindowExpiresAt: true,
    },
  });

  if (!guest || !guest.serviceWindowExpiresAt) {
    return {
      isActive: false,
      expiresAt: null,
      hoursRemaining: null,
      canUseFreeForm: false,
      canUseFreeUtility: false,
    };
  }

  const now = new Date();
  const isActive = guest.serviceWindowExpiresAt > now;

  if (!isActive) {
    return {
      isActive: false,
      expiresAt: guest.serviceWindowExpiresAt,
      hoursRemaining: 0,
      canUseFreeForm: false,
      canUseFreeUtility: false,
    };
  }

  const hoursRemaining =
    (guest.serviceWindowExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  return {
    isActive: true,
    expiresAt: guest.serviceWindowExpiresAt,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    canUseFreeForm: true,
    canUseFreeUtility: true,
  };
}

/**
 * Check if guest is within service window (quick check)
 */
export async function isWithinServiceWindow(guestId: string): Promise<boolean> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { serviceWindowExpiresAt: true },
  });

  if (!guest || !guest.serviceWindowExpiresAt) {
    return false;
  }

  return guest.serviceWindowExpiresAt > new Date();
}

/**
 * Open or extend service window when user sends message
 */
export async function openServiceWindow(guestId: string): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SERVICE_WINDOW_HOURS * 60 * 60 * 1000);

  await prisma.guest.update({
    where: { id: guestId },
    data: {
      lastUserMessageAt: now,
      serviceWindowExpiresAt: expiresAt,
      totalUserMessages: {
        increment: 1,
      },
    },
  });

  console.log(`✅ Service window opened for guest ${guestId} until ${expiresAt.toISOString()}`);
}

/**
 * Get service window statistics for analytics
 */
export async function getServiceWindowStats(eventId: string): Promise<{
  totalGuests: number;
  guestsWithActiveWindow: number;
  guestsWithExpiredWindow: number;
  guestsNeverMessaged: number;
  potentialSavingsPerMessage: number; // If used within window
}> {
  const guests = await prisma.guest.findMany({
    where: { weddingEventId: eventId },
    select: {
      id: true,
      serviceWindowExpiresAt: true,
      lastUserMessageAt: true,
    },
  });

  const now = new Date();
  const totalGuests = guests.length;

  const guestsWithActiveWindow = guests.filter(
    (g) => g.serviceWindowExpiresAt && g.serviceWindowExpiresAt > now
  ).length;

  const guestsWithExpiredWindow = guests.filter(
    (g) => g.serviceWindowExpiresAt && g.serviceWindowExpiresAt <= now
  ).length;

  const guestsNeverMessaged = guests.filter((g) => !g.lastUserMessageAt).length;

  // Savings: Marketing template ($0.086) vs free in window ($0.005)
  const potentialSavingsPerMessage = 0.086 - 0.005; // $0.081

  return {
    totalGuests,
    guestsWithActiveWindow,
    guestsWithExpiredWindow,
    guestsNeverMessaged,
    potentialSavingsPerMessage,
  };
}
```

#### 3.3 Webhook Updates for Incoming Messages

**File:** `app/api/twilio/whatsapp/route.ts` (modifications)

```typescript
// Add after line 100 (existing code handles buttons/lists)

// NEW: Track ALL incoming messages for service window
await handleIncomingMessage(payload);

return NextResponse.json({ received: true });

// ... existing validation and button/list handlers ...

/**
 * NEW FUNCTION: Handle all incoming messages
 * Opens/extends 24-hour service window
 */
async function handleIncomingMessage(payload: Record<string, string>) {
  try {
    const from = payload.From?.replace("whatsapp:", "") || "";
    const body = payload.Body || "";
    const messageSid = payload.MessageSid || "";
    const messageType = payload.ButtonPayload
      ? "button"
      : payload.ListId
      ? "list"
      : payload.MediaContentType0
      ? "media"
      : "text";

    console.log(`📨 Incoming WhatsApp message from ${from}: ${body.substring(0, 50)}...`);

    // Find guest by phone number
    const phoneVariations = buildPhoneVariations(from);
    const guest = await prisma.guest.findFirst({
      where: {
        phoneNumber: {
          in: phoneVariations,
        },
      },
    });

    // Log incoming message
    await prisma.incomingMessage.create({
      data: {
        guestId: guest?.id,
        phoneNumber: from,
        messageBody: body,
        twilioMessageSid: messageSid,
        messageType,
        receivedAt: new Date(),
      },
    });

    // Open/extend service window if guest found
    if (guest) {
      const { openServiceWindow } = await import("@/lib/notifications/service-window");
      await openServiceWindow(guest.id);

      console.log(`✅ Service window activated for guest ${guest.name} (${guest.id})`);
    } else {
      console.warn(`⚠️  Guest not found for phone number: ${from}`);
    }
  } catch (error) {
    console.error("Error handling incoming message:", error);
    // Don't throw - webhook should always return 200
  }
}
```

#### 3.4 Notification Service Updates

**File:** `lib/notifications/real-service.ts` (modifications)

Add service window check before sending:

```typescript
// Import at top
import { isWithinServiceWindow, getServiceWindowStatus } from "./service-window";

// In sendMessage method (around line 59), add before sending:

private async sendMessage(
  guest: Guest,
  message: string,
  preferredChannel?: NotificationChannel,
  alphaSenderId?: string | null,
  whatsappOptions?: {
    contentSid?: string;
    contentVariables?: Record<string, string>;
  }
): Promise<NotificationResult> {
  // ... existing code to determine channel ...

  // NEW: Check service window for WhatsApp
  if (channel === NotificationChannel.WHATSAPP) {
    const windowStatus = await getServiceWindowStatus(guest.id);

    if (windowStatus.isActive) {
      console.log(
        `🎉 Service window active for ${guest.name}! ` +
        `${windowStatus.hoursRemaining}h remaining. Using free messaging.`
      );

      // Within service window - use free-form message or free utility template
      // Option 1: Use free-form message (no template needed)
      if (!whatsappOptions?.contentSid) {
        // Send as free-form message
        const freeFormResult = await sendWhatsApp(
          client,
          fromNumber,
          phoneNumber,
          message
          // No contentSid = free-form message
        );

        if (freeFormResult.success) {
          return {
            success: true,
            status: NotificationStatus.SENT,
            channel: NotificationChannel.WHATSAPP,
            providerResponse: JSON.stringify({
              messageId: freeFormResult.messageId,
              status: freeFormResult.status,
              serviceWindow: true,
              savedCost: 0.081, // $0.086 - $0.005
            }),
          };
        }
      }

      // Option 2: Use utility template (free within window)
      // Continue with template send, but mark as within service window
    }
  }

  // ... rest of existing sendMessage code ...
}
```

#### 3.5 UI Indicators

**File:** `components/guests/service-window-badge.tsx`

```typescript
"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";

interface ServiceWindowBadgeProps {
  guestId: string;
  serviceWindowExpiresAt: Date | null;
}

export function ServiceWindowBadge({
  guestId,
  serviceWindowExpiresAt,
}: ServiceWindowBadgeProps) {
  const [status, setStatus] = useState<"active" | "expired" | "none">("none");
  const [hoursRemaining, setHoursRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!serviceWindowExpiresAt) {
      setStatus("none");
      return;
    }

    const checkStatus = () => {
      const now = new Date();
      const expiresAt = new Date(serviceWindowExpiresAt);

      if (expiresAt > now) {
        const hours = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        setStatus("active");
        setHoursRemaining(Math.round(hours * 10) / 10);
      } else {
        setStatus("expired");
        setHoursRemaining(null);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [serviceWindowExpiresAt]);

  if (status === "none") {
    return null;
  }

  if (status === "active") {
    return (
      <Badge variant="success" className="gap-1">
        <Icons.check className="h-3 w-3" />
        Free messaging ({hoursRemaining}h left)
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1">
      <Icons.clock className="h-3 w-3" />
      Window expired
    </Badge>
  );
}
```

**Add to guest table in:** `components/guests/guest-table.tsx`

```typescript
// In table columns definition
{
  accessorKey: "serviceWindow",
  header: "Free Window",
  cell: ({ row }) => (
    <ServiceWindowBadge
      guestId={row.original.id}
      serviceWindowExpiresAt={row.original.serviceWindowExpiresAt}
    />
  ),
}
```

---

## Part 4: Create New Utility Category Templates

### Templates to Create

#### 4.1 CONFIRMATION Template (Utility)

**Category:** UTILITY
**Cost:** $0.014 (vs $0.086 Marketing)
**Savings:** $0.072 per message

**Formal Style (Hebrew):**
```
שלום {{1}},

אישור הגעה ל{{2}} התקבל בהצלחה ✓

מספר אורחים: {{3}}
תאריך: {{4}}
מיקום: {{5}}

תודה שאישרתם הגעתכם. נשמח לראותכם!
```

**Formal Style (English):**
```
Hello {{1}},

Your RSVP for {{2}} has been confirmed ✓

Guest count: {{3}}
Date: {{4}}
Location: {{5}}

Thank you for confirming. We look forward to seeing you!
```

**Creation Steps:**
1. Open Twilio Console → Content Editor
2. Create new content template:
   - Name: `confirmation_formal_he` / `confirmation_formal_en`
   - Language: Hebrew / English
   - Category: **UTILITY** (important!)
   - Variables: {{1}}, {{2}}, {{3}}, {{4}}, {{5}}
3. Submit for WhatsApp approval
4. Wait 24-48 hours for approval
5. Add Content SID to database via admin UI

#### 4.2 TABLE_ASSIGNMENT Template (Utility)

**Category:** UTILITY
**Cost:** $0.014 (vs free-form requiring service window)
**Savings:** Enables sending anytime without service window

**Formal Style (Hebrew):**
```
שלום {{1}},

שובצת לשולחן {{2}} באירוע {{3}}

📅 תאריך: {{4}}
🕐 שעה: {{5}}
📍 מיקום: {{6}}

נתראה שם!
```

**Formal Style (English):**
```
Hello {{1}},

You have been assigned to table {{2}} for {{3}}

📅 Date: {{4}}
🕐 Time: {{5}}
📍 Location: {{6}}

See you there!
```

**Creation Steps:**
1. Create in Twilio as UTILITY category
2. Get WhatsApp approval
3. Update code to use template instead of free-form message

**Code Update Required:**
```typescript
// In actions/seating.ts or wherever table assignments are sent
// BEFORE: Send free-form message (requires service window)
// AFTER: Use UTILITY template (works anytime)

const result = await notificationService.sendMessage(guest, message, {
  contentSid: "HX_TABLE_ASSIGNMENT_SID", // Get from database
  contentVariables: {
    "1": guest.name,
    "2": tableNumber,
    "3": event.title,
    "4": formatDate(event.dateTime),
    "5": formatTime(event.dateTime),
    "6": event.location,
  },
});
```

#### 4.3 EVENT_DAY Template (Utility) - RECLASSIFY

**Current:** Marketing template (HX80e0ff2024fb29d65878e002df31afd3)
**Should Be:** UTILITY
**Action:** Create new UTILITY version

**Justification:**
- Sent only to confirmed guests
- Operational reminder (time, place, table)
- Related to prior RSVP transaction
- No promotional content

**Template (Hebrew):**
```
שלום {{1}},

האירוע {{2}} מתקיים היום! 🎉

🪑 שולחן: {{3}}
🕐 שעה: {{4}}
📍 כתובת: {{5}}

{{6}}

נתראה בקרוב!
```

**Variables:**
- {{1}} = Guest name
- {{2}} = Event title
- {{3}} = Table number
- {{4}} = Event time
- {{5}} = Full address
- {{6}} = Gift link (optional)

**Creation Steps:**
1. Create NEW template as UTILITY category
2. Get WhatsApp approval
3. Update `MessagingProviderSettings.whatsappEventDayContentSid` (if exists)
4. Update automation flows to use new UTILITY template
5. **Keep old marketing template as fallback** until fully tested

### Template Creation Checklist

For each new template:

- [ ] Define template purpose and category
- [ ] Verify UTILITY classification is appropriate
- [ ] Write template text (Hebrew + English)
- [ ] Identify all variables
- [ ] Create in Twilio Console as UTILITY
- [ ] Submit for WhatsApp approval
- [ ] Wait for approval (24-48 hours)
- [ ] Add Content SID to database
- [ ] Update code to use new template
- [ ] Test with real phone number
- [ ] Monitor delivery status
- [ ] Measure cost savings

---

## Part 5: Implementation Timeline & Success Metrics

### Phase 1: Foundation (Week 1-2)

**Goals:**
- ✅ Set up Twilio Content API integration
- ✅ Implement service window tracking
- ✅ Update webhooks to track incoming messages

**Tasks:**
1. Create Twilio Content API wrapper (`lib/twilio/content-api.ts`)
2. Add database schema changes for service window tracking
3. Update WhatsApp webhook to track all incoming messages
4. Create service window utilities
5. Add UI indicators for active service windows

**Success Criteria:**
- All incoming WhatsApp messages logged
- Service window status accurately tracked
- Webhooks processing correctly

### Phase 2: Template Management (Week 3-4)

**Goals:**
- ✅ Enable in-app template creation
- ✅ Sync templates with Twilio
- ✅ Admin UI for template management

**Tasks:**
1. Create server actions for template operations
2. Build template creator UI component
3. Implement template sync functionality
4. Add approval status tracking
5. Test template creation workflow

**Success Criteria:**
- Can create templates from admin UI
- Templates sync with Twilio
- Approval status visible in app

### Phase 3: Utility Templates (Week 5-6)

**Goals:**
- ✅ Create 3 new UTILITY templates
- ✅ Get WhatsApp approval
- ✅ Update code to use new templates

**Tasks:**
1. Create CONFIRMATION utility template
2. Create TABLE_ASSIGNMENT utility template
3. Create EVENT_DAY utility template (reclassify)
4. Submit all for WhatsApp approval
5. Update notification service to use utility templates
6. Update automation flows

**Success Criteria:**
- All 3 templates approved by WhatsApp
- Code updated to use utility templates
- Cost per message reduced for these types

### Phase 4: Service Window Optimization (Week 7-8)

**Goals:**
- ✅ Leverage free messaging windows
- ✅ Optimize sending logic
- ✅ Measure cost savings

**Tasks:**
1. Update notification service to check service window
2. Implement free-form messaging when in window
3. Add CTAs to trigger guest replies
4. A/B test engagement strategies
5. Build analytics dashboard

**Success Criteria:**
- Service window utilization >40%
- Free-form messages used when possible
- Cost per message trending down

### Phase 5: Advanced Optimization (Week 9-12)

**Goals:**
- ✅ Click-to-WhatsApp ads integration
- ✅ Multi-channel strategy
- ✅ Volume tier optimization

**Tasks:**
1. Implement CTWA ads tracking
2. Create multi-channel cascade logic
3. Build cost analytics dashboard
4. Optimize template selection
5. Document best practices

**Success Criteria:**
- CTWA ads implemented (optional)
- Multi-channel fallback working
- Cost savings documented

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Cost Metrics:**
1. **Average Cost Per Message**
   - Baseline: $0.091 (current marketing)
   - Target: $0.025 (mixed utility/marketing)
   - Stretch: $0.015 (with service windows)

2. **Cost Per Event (200 guests)**
   - Baseline: $77.35
   - Target: $30.00 (61% reduction)
   - Stretch: $15.00 (81% reduction)

3. **Service Window Utilization**
   - Target: 40% of follow-up messages sent in free window
   - Measure: % of messages with $0.005 cost

4. **Template Distribution**
   - Utility templates: 60% of total
   - Marketing templates: 40% of total

**Operational Metrics:**
1. **Template Approval Time**
   - Track: Time from creation to approval
   - Target: <48 hours average

2. **Template Creation Success Rate**
   - Track: % of templates approved on first submission
   - Target: >80%

3. **Guest Engagement Rate**
   - Track: % of guests who reply to initial message
   - Target: >50% (opens service window)

### Analytics Queries

**Cost Savings Report:**
```sql
WITH template_costs AS (
  SELECT
    nl.type,
    COUNT(*) as messages,
    CASE
      WHEN wt.category = 'UTILITY' THEN 0.019
      WHEN wt.category = 'MARKETING' THEN 0.091
      ELSE 0.091
    END as cost_per_message
  FROM notification_logs nl
  LEFT JOIN whatsapp_templates wt ON nl.template_sid = wt.content_sid
  WHERE nl.channel = 'WHATSAPP'
    AND nl.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY nl.type, wt.category
)
SELECT
  type,
  messages,
  cost_per_message,
  messages * cost_per_message as total_cost,
  messages * (0.091 - cost_per_message) as savings
FROM template_costs
ORDER BY total_cost DESC;
```

**Service Window Effectiveness:**
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE provider_response::json->>'serviceWindow' = 'true') as in_window,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE provider_response::json->>'serviceWindow' = 'true') / COUNT(*), 1) as window_pct
FROM notification_logs
WHERE channel = 'WHATSAPP'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Risk Mitigation

### Risk 1: Template Rejection by WhatsApp

**Probability:** Medium
**Impact:** High (delays cost optimization)

**Mitigation:**
- Follow WhatsApp Content Policy strictly
- Use proven template patterns
- Test with similar approved templates
- Have fallback marketing templates
- Submit templates early in project

### Risk 2: Service Window Not Tracking Correctly

**Probability:** Low
**Impact:** Medium (missed savings opportunities)

**Mitigation:**
- Comprehensive webhook logging
- Monitor incoming message tracking
- Alert on webhook failures
- Manual testing with real numbers
- Gradual rollout with monitoring

### Risk 3: Utility Template Misclassification

**Probability:** Medium
**Impact:** High (WhatsApp may reclassify as marketing)

**Mitigation:**
- Conservative interpretation of guidelines
- No promotional language in utility templates
- Ensure transaction-based justification
- Monitor reclassification warnings
- Prepare to revert if reclassified

### Risk 4: Increased Complexity

**Probability:** High
**Impact:** Medium (maintenance burden)

**Mitigation:**
- Comprehensive documentation
- Automated testing
- Monitoring and alerting
- Gradual feature rollout
- Team training

---

## Appendix A: WhatsApp Template Category Guidelines

### UTILITY Templates (Cheaper: $0.014)

**Allowed:**
- ✅ Transaction confirmations (RSVP confirmed)
- ✅ Status updates (table assigned)
- ✅ Account updates
- ✅ Appointment reminders **tied to confirmed booking**
- ✅ Payment confirmations
- ✅ Shipping notifications
- ✅ Post-purchase follow-up

**Not Allowed:**
- ❌ Promotional content
- ❌ Upselling or cross-selling
- ❌ Marketing offers
- ❌ New product announcements
- ❌ General event invitations
- ❌ "Save the date" messages

**Key Rule:**
*"Must be related to a specific agreed-upon transaction or service the user has already engaged with."*

### MARKETING Templates (Expensive: $0.086)

**Allowed:**
- ✅ Product promotions
- ✅ Event invitations
- ✅ Special offers
- ✅ Cross-sell/upsell
- ✅ Loyalty rewards
- ✅ New product launches
- ✅ General announcements

**Not Allowed:**
- ❌ Claiming to be transactional when promotional

**Key Rule:**
*"Primary purpose is to promote a product, service, or offer."*

### AUTHENTICATION Templates (Cheaper: $0.014)

**Allowed:**
- ✅ OTP codes
- ✅ Password resets
- ✅ Account verification
- ✅ Login codes

**Not Allowed:**
- ❌ Marketing content
- ❌ Promotional messaging

---

## Appendix B: Twilio Content API Reference

### Create Content Template

```bash
curl -X POST https://content.twilio.com/v1/Content \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "friendly_name": "confirmation_formal_he",
    "language": "he",
    "variables": {
      "1": "{{1}}",
      "2": "{{2}}",
      "3": "{{3}}"
    },
    "types": {
      "twilio/text": {
        "body": "שלום {{1}}, אישור הגעה ל{{2}} התקבל. מספר אורחים: {{3}}"
      }
    }
  }'
```

### Get Content Template

```bash
curl https://content.twilio.com/v1/Content/HXxxxxx \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

### List All Content Templates

```bash
curl https://content.twilio.com/v1/Content \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

### Check Approval Status

```bash
curl https://content.twilio.com/v1/Content/HXxxxxx/ApprovalRequests \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
```

---

## Appendix C: Cost Calculation Examples

### Example 1: 200-Guest Wedding (Current State)

**Messages Sent:**
- Initial invites: 200 × $0.091 = $18.20
- Reminders: 200 × $0.091 = $18.20
- Confirmations: 150 × $0.091 = $13.65
- Table assignments: 150 × $0.091 = $13.65
- Event day: 150 × $0.091 = $13.65
- **Total: $77.35**

### Example 2: 200-Guest Wedding (Optimized)

**Messages Sent:**
- Initial invites (marketing): 200 × $0.091 = $18.20
  - 70% reply → open service window
- Reminders (in service window, free): 60 × $0.005 = $0.30
- Reminders (outside window, marketing): 90 × $0.091 = $8.19
- Confirmations (utility): 150 × $0.014 = $2.10
- Table assignments (utility): 150 × $0.014 = $2.10
- Event day (utility): 150 × $0.014 = $2.10
- **Total: $32.99**
- **Savings: $44.36 (57%)**

### Example 3: 200-Guest Wedding (Fully Optimized with CTWA)

**Messages Sent:**
- CTWA ad campaign: $20 one-time
- Initial invites (via CTWA, 72h window): 200 × $0.005 = $1.00
- All follow-ups within 72h: 600 × $0.005 = $3.00
- **Total: $24.00**
- **Savings: $53.35 (69%)**

---

## Next Steps

1. **Review and approve this plan**
2. **Allocate development resources** (1-2 developers for 8-12 weeks)
3. **Set up Twilio Content API credentials** (use existing account)
4. **Create development/staging environment** for testing
5. **Begin Phase 1 implementation** (Twilio integration + service window tracking)
6. **Schedule regular check-ins** to track progress

---

**End of Plan**

*This plan provides a comprehensive roadmap to reduce WhatsApp messaging costs by 69-94% through template optimization, service window tracking, and intelligent message routing. Implementation should be done incrementally with careful testing at each phase.*
