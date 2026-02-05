"use client";

import { Info } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WhatsAppTemplateType } from "@/config/whatsapp-templates";

interface VariableHelperProps {
  templateType: WhatsAppTemplateType;
  style?: "style1" | "style2" | "style3";
}

/**
 * 11-variable structure for WhatsApp templates
 * Each detail has its own variable for maximum flexibility
 *
 * IMPORTANT:
 * - {{7}} = Navigation URL (Waze/Google Maps) - USED IN ALL TEMPLATES
 * - {{11}} = RSVP Link (guest RSVP page) - ONLY for INVITE/REMINDER
 */
const ALL_VARIABLES = [
  { variable: "{{1}}", name: "Guest Name", description: "שם האורח/ת", example: "דני, משפחת כהן", priority: "high" },
  { variable: "{{2}}", name: "Event Title", description: "שם האירוע", example: "חתונת דני ושרה", priority: "high" },
  { variable: "{{3}}", name: "Venue Name", description: "שם המקום", example: "אולם מאגיה", priority: "medium" },
  { variable: "{{4}}", name: "Venue Address", description: "כתובת מלאה", example: "רחוב החשמל 5, טבריה", priority: "medium" },
  { variable: "{{5}}", name: "Event Date", description: "תאריך", example: "יום שישי, 15 במרץ 2026", priority: "medium" },
  { variable: "{{6}}", name: "Event Time", description: "שעה", example: "20:00, שבע בערב", priority: "medium" },
  { variable: "{{7}}", name: "Navigation URL", description: "קישור ניווט (Waze)", example: "https://wedinex.co/n/abc", priority: "high" },
  { variable: "{{8}}", name: "Table Number", description: "מספר שולחן", example: "12, VIP-3", priority: "low" },
  { variable: "{{9}}", name: "Transportation Link", description: "קישור רישום להסעות", example: "https://wedinex.co/t/abc", priority: "medium" },
  { variable: "{{10}}", name: "Media URL", description: "נתיב תמונה/מדיה", example: "invitations/sample.jpg", priority: "medium" },
  { variable: "{{11}}", name: "RSVP Link", description: "קישור אישור הגעה", example: "https://wedinex.co/rsvp/abc", priority: "high" },
];

// Define which variables are typically used for each template type and style
const VARIABLE_USAGE: Record<WhatsAppTemplateType, {
  style1: string[];
  style2: string[];
  style3: string[];
  description: string;
}> = {
  INVITE: {
    style1: ["{{1}}", "{{2}}", "{{11}}"],
    style2: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{11}}"],
    style3: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}", "{{9}}", "{{11}}"],
    description: "{{11}} = RSVP Link | Style 3: {{11}} = RSVP + {{9}} = Transportation + {{7}} = Navigation"
  },
  REMINDER: {
    style1: ["{{1}}", "{{2}}", "{{11}}"],
    style2: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{11}}"],
    style3: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}", "{{9}}", "{{11}}"],
    description: "{{11}} = RSVP Link | Style 3: {{11}} = RSVP + {{9}} = Transportation + {{7}} = Navigation"
  },
  INTERACTIVE_INVITE: {
    style1: ["{{1}}", "{{2}}", "{{7}}"],
    style2: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}"],
    style3: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}", "{{9}}"],
    description: "{{7}} = Navigation | Buttons handle RSVP | Style 3: +{{9}} = Transportation"
  },
  INTERACTIVE_REMINDER: {
    style1: ["{{1}}", "{{2}}", "{{7}}"],
    style2: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}"],
    style3: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}", "{{9}}"],
    description: "{{7}} = Navigation | Buttons handle RSVP | Style 3: +{{9}} = Transportation"
  },
  IMAGE_INVITE: {
    style1: ["{{1}}", "{{2}}", "{{7}}"],
    style2: ["{{1}}", "{{2}}", "{{7}}"],
    style3: ["{{1}}", "{{2}}", "{{7}}"],
    description: "{{7}} = Navigation | Buttons handle RSVP"
  },
  CONFIRMATION: {
    style1: ["{{1}}", "{{2}}", "{{7}}"],
    style2: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}"],
    style3: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}"],
    description: "{{7}} = Navigation Link (Waze to venue)"
  },
  EVENT_DAY: {
    style1: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{6}}", "{{7}}", "{{8}}"],
    style2: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{6}}", "{{7}}", "{{8}}"],
    style3: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{6}}", "{{7}}", "{{8}}"],
    description: "{{7}} = Navigation Link | {{8}} = Table Number"
  },
  THANK_YOU: {
    style1: ["{{1}}", "{{2}}", "{{7}}"],
    style2: ["{{1}}", "{{2}}", "{{7}}"],
    style3: ["{{1}}", "{{2}}", "{{7}}"],
    description: "{{7}} = Feedback/Photo Link"
  },
  TABLE_ASSIGNMENT: {
    style1: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{6}}", "{{7}}", "{{8}}"],
    style2: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{6}}", "{{7}}", "{{8}}"],
    style3: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{6}}", "{{7}}", "{{8}}"],
    description: "{{7}} = Navigation Link | {{8}} = Table Number"
  },
  GUEST_COUNT_LIST: {
    style1: ["{{1}}", "{{2}}", "{{7}}"],
    style2: ["{{1}}", "{{2}}", "{{7}}"],
    style3: ["{{1}}", "{{2}}", "{{7}}"],
    description: "{{7}} = Guest Count Selection Link"
  },
  // Legacy - deprecated (Style 3 transportation-focused)
  TRANSPORTATION_INVITE: {
    style1: ["{{1}}", "{{2}}", "{{11}}"],
    style2: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{11}}"],
    style3: ["{{1}}", "{{2}}", "{{3}}", "{{4}}", "{{5}}", "{{6}}", "{{7}}", "{{9}}", "{{11}}"],
    description: "{{11}} = RSVP | {{9}} = Transportation | {{7}} = Navigation"
  },
};

export function VariableHelper({ templateType, style = "style1" }: VariableHelperProps) {
  // Get the recommended variables for this template type and style
  const usage = VARIABLE_USAGE[templateType];
  const recommendedVars = usage ? usage[style] : ["{{1}}", "{{2}}", "{{7}}"];

  // Get full variable info for recommended vars
  const recommendedVariables = recommendedVars
    .map(v => ALL_VARIABLES.find(av => av.variable === v))
    .filter(Boolean) as typeof ALL_VARIABLES;

  // Get other available variables (not recommended but can be used)
  const otherVariables = ALL_VARIABLES.filter(
    v => !recommendedVars.includes(v.variable)
  );

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-3 flex-1">
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Available Variables - 11 Variable System
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Each piece of information has its own variable. <strong>Variable 7 is ALWAYS Navigation URL</strong> (Waze/Google Maps). <strong>Variable 11 is RSVP Link</strong> (only for INVITE/REMINDER). Variable 9 is Transportation Link (Style 3). Variable 10 is Media URL (templates with images).
            </p>
          </div>

          {/* Recommended Variables */}
          <div>
            <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
              ✅ Recommended for {usage?.description || "this template"}
            </h5>
            <div className="flex flex-wrap gap-2">
              {recommendedVariables.map((v) => (
                <Badge
                  key={v.variable}
                  variant="outline"
                  className="font-mono text-xs bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-700"
                  title={`Example: ${v.example}`}
                >
                  {v.variable} = {v.description}
                </Badge>
              ))}
            </div>
          </div>

          {/* Other Available Variables */}
          {otherVariables.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">
                ℹ️ Other Available Variables
              </h5>
              <div className="flex flex-wrap gap-2">
                {otherVariables.map((v) => (
                  <Badge
                    key={v.variable}
                    variant="outline"
                    className="font-mono text-xs bg-white dark:bg-gray-800 text-muted-foreground"
                    title={`Example: ${v.example}`}
                  >
                    {v.variable} = {v.description}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="text-xs text-blue-700 dark:text-blue-300 pt-2 border-t border-blue-200 dark:border-blue-800">
            <p className="font-semibold mb-1">⚠️ Important WhatsApp Guidelines:</p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px]">
              <li>Variables cannot be at the very start or end of your message</li>
              <li>Template body max: 1024 characters</li>
              <li>Button text max: 20 characters</li>
              <li>Use variables in sequence (don't skip numbers)</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
