"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TemplatePreviewProps {
  bodyHe?: string;
  bodyEn?: string;
  buttons?: Array<{ id: string; titleHe: string; titleEn?: string }>;
}

export function TemplatePreview({ bodyHe, bodyEn, buttons }: TemplatePreviewProps) {
  // Replace variables with sample values for preview
  const replaceVariables = (text: string) => {
    return text
      .replace(/\{\{1\}\}/g, "John Doe")
      .replace(/\{\{2\}\}/g, "Sarah & David's Wedding")
      .replace(/\{\{3\}\}/g, "https://example.com/rsvp/abc123")
      .replace(/\{\{4\}\}/g, "https://example.com/transport/abc123")
      .replace(/\{\{5\}\}/g, "https://maps.google.com/...")
      .replace(/\{\{6\}\}/g, "https://example.com/gift/abc123");
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Hebrew Preview */}
      {bodyHe && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Hebrew Preview</span>
            <Badge variant="outline" className="text-xs">
              עברית
            </Badge>
          </div>
          <Card className="p-4 bg-white dark:bg-gray-800">
            <div className="space-y-3">
              <p className="text-sm whitespace-pre-wrap" dir="rtl">
                {replaceVariables(bodyHe)}
              </p>

              {buttons && buttons.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t" dir="rtl">
                  {buttons.map((btn) => (
                    <button
                      key={btn.id}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      type="button"
                    >
                      {btn.titleHe}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* English Preview */}
      {bodyEn && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">English Preview</span>
            <Badge variant="outline" className="text-xs">
              English
            </Badge>
          </div>
          <Card className="p-4 bg-white dark:bg-gray-800">
            <div className="space-y-3">
              <p className="text-sm whitespace-pre-wrap">{replaceVariables(bodyEn)}</p>

              {buttons && buttons.length > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t">
                  {buttons.map((btn) => (
                    <button
                      key={btn.id}
                      className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      type="button"
                    >
                      {btn.titleEn || btn.titleHe}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
