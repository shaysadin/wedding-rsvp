"use client";

import { useTranslations } from "next-intl";
import { EventType } from "@prisma/client";

import { usePdfWizard } from "../wizard-context";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";

const EVENT_TYPE_OPTIONS: {
  type: EventType;
  icon: keyof typeof Icons;
  colorClass: string;
}[] = [
  { type: "WEDDING", icon: "heart", colorClass: "hover:border-pink-500 data-[selected=true]:border-pink-500 data-[selected=true]:bg-pink-50 dark:data-[selected=true]:bg-pink-950" },
  { type: "HENNA", icon: "sparkles", colorClass: "hover:border-orange-500 data-[selected=true]:border-orange-500 data-[selected=true]:bg-orange-50 dark:data-[selected=true]:bg-orange-950" },
  { type: "ENGAGEMENT", icon: "gem", colorClass: "hover:border-purple-500 data-[selected=true]:border-purple-500 data-[selected=true]:bg-purple-50 dark:data-[selected=true]:bg-purple-950" },
  { type: "OTHER", icon: "calendar", colorClass: "hover:border-blue-500 data-[selected=true]:border-blue-500 data-[selected=true]:bg-blue-50 dark:data-[selected=true]:bg-blue-950" },
];

export function EventTypeStep() {
  const t = useTranslations("pdfInvitations");
  const { eventType, setEventType, setStep } = usePdfWizard();

  const handleSelect = (type: EventType) => {
    setEventType(type);
    // Auto-advance to next step after selection
    setTimeout(() => setStep(2), 300);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t("selectEventType")}</h2>
        <p className="text-muted-foreground">{t("selectEventTypeDescription")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
        {EVENT_TYPE_OPTIONS.map(({ type, icon, colorClass }) => {
          const Icon = Icons[icon];
          const isSelected = eventType === type;

          return (
            <Card
              key={type}
              data-selected={isSelected}
              onClick={() => handleSelect(type)}
              className={cn(
                "cursor-pointer transition-all duration-200 border-2",
                colorClass,
                isSelected && "ring-2 ring-offset-2"
              )}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                <Icon className="h-10 w-10" />
                <span className="font-medium text-center">
                  {t(`eventTypes.${type.toLowerCase()}`)}
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
