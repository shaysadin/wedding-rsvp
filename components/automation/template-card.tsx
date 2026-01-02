"use client";

import { useLocale } from "next-intl";
import { Plus, Check, Sparkles, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FlowNode, FlowConnector } from "./flow-node";
import { AutomationTrigger, AutomationAction } from "@prisma/client";
import { Icons } from "@/components/shared/icons";

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    nameHe: string;
    description: string | null;
    descriptionHe: string | null;
    trigger: AutomationTrigger;
    action: AutomationAction;
  };
  isUsed: boolean;
  isLoading: boolean;
  onSelect: (templateId: string) => void;
}

// Template category badges
const TEMPLATE_CATEGORIES: Record<string, { en: string; he: string; color: string }> = {
  "The Chaser": { en: "Reminder", he: "תזכורת", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "The Concierge": { en: "Event Day", he: "יום האירוע", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  "Thank You": { en: "Response", he: "תגובה", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  "Second Chance": { en: "Follow-up", he: "מעקב", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  "Location Reminder": { en: "Event Day", he: "יום האירוע", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

export function TemplateCard({ template, isUsed, isLoading, onSelect }: TemplateCardProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const category = TEMPLATE_CATEGORIES[template.name];

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      isUsed
        ? "opacity-60 cursor-not-allowed"
        : "hover:shadow-lg hover:-translate-y-1 cursor-pointer"
    )}>
      {/* Decorative gradient top */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500" />

      {/* Used indicator */}
      {isUsed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] z-10">
          <Badge variant="secondary" className="gap-1.5 text-sm">
            <Check className="h-3.5 w-3.5" />
            {isRTL ? "כבר הופעל" : "Already Added"}
          </Badge>
        </div>
      )}

      <CardContent className="p-4 pt-6">
        {/* Header */}
        <div className={cn("flex items-start justify-between mb-3", isRTL && "flex-row-reverse")}>
          <div className={cn("space-y-1", isRTL && "text-right")}>
            <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Sparkles className="h-4 w-4 text-purple-500" />
              <h3 className="font-semibold">
                {isRTL ? template.nameHe : template.name}
              </h3>
            </div>
            {category && (
              <Badge variant="secondary" className={cn("text-[10px] h-5", category.color)}>
                {isRTL ? category.he : category.en}
              </Badge>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={isRTL ? "left" : "right"} className="max-w-[200px]">
                <p className={cn("text-xs", isRTL && "text-right")}>
                  {isRTL ? template.descriptionHe : template.description}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Description */}
        <p className={cn(
          "text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2.5em]",
          isRTL && "text-right"
        )}>
          {isRTL ? template.descriptionHe : template.description}
        </p>

        {/* Visual Flow Preview */}
        <div className="mb-4 py-3 px-2 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-900 dark:to-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col items-center space-y-1 scale-[0.75] origin-center">
            <FlowNode type="trigger" value={template.trigger} />
            <FlowConnector />
            <FlowNode type="action" value={template.action} />
          </div>
        </div>

        {/* Add Button */}
        <Button
          onClick={() => onSelect(template.id)}
          disabled={isUsed || isLoading}
          className="w-full gap-2"
          variant={isUsed ? "secondary" : "default"}
        >
          {isLoading ? (
            <Icons.spinner className="h-4 w-4 animate-spin" />
          ) : isUsed ? (
            <>
              <Check className="h-4 w-4" />
              {isRTL ? "כבר הופעל" : "Already Added"}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {isRTL ? "הוסף אוטומציה" : "Add Automation"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
