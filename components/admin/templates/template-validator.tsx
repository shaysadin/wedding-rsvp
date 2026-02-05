"use client";

import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { validateWhatsAppTemplate, previewTemplate } from "@/lib/notifications/whatsapp-template-renderer";

interface TemplateValidatorProps {
  templateBody: string;
  buttons?: Array<{ id: string; titleHe: string; titleEn?: string }>;
  locale?: "he" | "en";
}

export function TemplateValidator({
  templateBody,
  buttons = [],
  locale = "he",
}: TemplateValidatorProps) {
  // Create sample variables for validation
  const sampleVars: Record<string, string> = {
    "1": "דני ושרה",
    "2": "חתונת דני ושרה",
    "3": "אולם מאגיה",
    "4": "רחוב החשמל 5, טבריה",
    "5": "יום שישי, 15 במרץ 2026",
    "6": "20:00",
    "7": "https://wedinex.co/r/sample123",
    "8": "12",
  };

  // Validate template
  const validation = validateWhatsAppTemplate(templateBody, sampleVars, {
    buttons: buttons.map((b) => ({ title: locale === "he" ? b.titleHe : (b.titleEn || b.titleHe) })),
  });

  // Get preview
  const preview = previewTemplate(templateBody);

  // Count characters
  const charCount = preview.length;
  const charLimit = 1024;
  const charPercent = (charCount / charLimit) * 100;

  // Extract used variables
  const usedVars = new Set<string>();
  const varRegex = /\{\{(\d+)\}\}/g;
  let match;
  while ((match = varRegex.exec(templateBody)) !== null) {
    usedVars.add(match[1]);
  }

  const isValid = validation.valid;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div className="space-y-3">
      {/* Validation Status */}
      <Card
        className={`p-4 ${
          isValid
            ? hasWarnings
              ? "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
              : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
        }`}
      >
        <div className="flex items-start gap-3">
          {isValid ? (
            hasWarnings ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            )
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <h4
              className={`text-sm font-semibold ${
                isValid
                  ? hasWarnings
                    ? "text-yellow-900 dark:text-yellow-100"
                    : "text-green-900 dark:text-green-100"
                  : "text-red-900 dark:text-red-100"
              }`}
            >
              {isValid
                ? hasWarnings
                  ? "Valid with Warnings"
                  : "Template is Valid ✓"
                : "Template has Errors"}
            </h4>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="space-y-1">
                {validation.errors.map((error, idx) => (
                  <p key={idx} className="text-xs text-red-700 dark:text-red-300">
                    • {error}
                  </p>
                ))}
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-1">
                {validation.warnings.map((warning, idx) => (
                  <p key={idx} className="text-xs text-yellow-700 dark:text-yellow-300">
                    ⚠ {warning}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Character Count */}
      <Card className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Character Count</span>
            <Badge
              variant="outline"
              className={
                charPercent > 90
                  ? "bg-red-50 text-red-700 border-red-300"
                  : charPercent > 75
                  ? "bg-yellow-50 text-yellow-700 border-yellow-300"
                  : "bg-green-50 text-green-700 border-green-300"
              }
            >
              {charCount} / {charLimit}
            </Badge>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                charPercent > 90
                  ? "bg-red-500"
                  : charPercent > 75
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(charPercent, 100)}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Used Variables */}
      <Card className="p-3">
        <div className="space-y-2">
          <h5 className="text-sm font-semibold">Used Variables</h5>
          <div className="flex flex-wrap gap-2">
            {usedVars.size > 0 ? (
              Array.from(usedVars)
                .sort((a, b) => Number(a) - Number(b))
                .map((varNum) => (
                  <Badge key={varNum} variant="outline" className="font-mono text-xs">
                    {`{{${varNum}}}`}
                  </Badge>
                ))
            ) : (
              <p className="text-xs text-muted-foreground">No variables used</p>
            )}
          </div>
        </div>
      </Card>

      {/* Button Validation */}
      {buttons.length > 0 && (
        <Card className="p-3">
          <div className="space-y-2">
            <h5 className="text-sm font-semibold">Button Validation</h5>
            <div className="space-y-1">
              {buttons.map((btn, idx) => {
                const btnText = locale === "he" ? btn.titleHe : (btn.titleEn || btn.titleHe);
                const isValid = btnText.length <= 20;
                return (
                  <div key={btn.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Button {idx + 1}:</span>
                    <Badge
                      variant="outline"
                      className={
                        isValid
                          ? "bg-green-50 text-green-700 border-green-300"
                          : "bg-red-50 text-red-700 border-red-300"
                      }
                    >
                      {btnText} ({btnText.length}/20)
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Preview */}
      {templateBody && (
        <Card className="p-3 bg-gray-50 dark:bg-gray-900">
          <div className="space-y-2">
            <h5 className="text-sm font-semibold">Live Preview</h5>
            <div
              className="text-sm whitespace-pre-wrap p-3 bg-white dark:bg-gray-800 rounded border"
              dir={locale === "he" ? "rtl" : "ltr"}
            >
              {preview || (
                <span className="text-muted-foreground">Enter template body to see preview...</span>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
