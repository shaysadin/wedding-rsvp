"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";

import { usePdfWizard } from "../wizard-context";
import { getInvitationTemplates } from "@/actions/invitation-templates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";

interface Template {
  id: string;
  name: string;
  nameHe: string;
  description: string | null;
  descriptionHe: string | null;
  thumbnailUrl: string | null;
  pdfUrl: string;
  fields: Array<{
    id: string;
    fieldType: string;
    label: string;
    labelHe: string | null;
    isRequired: boolean;
    defaultValue: string | null;
  }>;
}

export function TemplateGalleryStep() {
  const t = useTranslations("pdfInvitations");
  const locale = useLocale();
  const { eventType, selectedTemplate, setSelectedTemplate, setStep } = usePdfWizard();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTemplates() {
      if (!eventType) return;

      setIsLoading(true);
      const result = await getInvitationTemplates(eventType);

      if (result.success && result.templates) {
        setTemplates(result.templates as unknown as Template[]);
      }
      setIsLoading(false);
    }

    loadTemplates();
  }, [eventType]);

  const handleSelect = (template: Template) => {
    setSelectedTemplate(template as any);
  };

  const handleContinue = () => {
    if (selectedTemplate) {
      setStep(3);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{t("selectTemplate")}</h2>
          <p className="text-muted-foreground">{t("selectTemplateDescription")}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[3/4] w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{t("selectTemplate")}</h2>
          <p className="text-muted-foreground">{t("selectTemplateDescription")}</p>
        </div>
        <div className="text-center py-12">
          <Icons.fileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t("noTemplatesAvailable")}</p>
          <Button
            variant="outline"
            onClick={() => setStep(1)}
            className="mt-4"
          >
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            {t("backToEventType")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t("selectTemplate")}</h2>
        <p className="text-muted-foreground">{t("selectTemplateDescription")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplate?.id === template.id;
          const displayName = locale === "he" ? template.nameHe : template.name;
          const displayDescription = locale === "he" ? template.descriptionHe : template.description;

          return (
            <Card
              key={template.id}
              onClick={() => handleSelect(template)}
              className={cn(
                "cursor-pointer transition-all duration-200 overflow-hidden border-2",
                "hover:border-primary/50 hover:shadow-lg",
                isSelected && "border-primary ring-2 ring-primary ring-offset-2"
              )}
            >
              <div className="relative aspect-[3/4] bg-muted">
                {template.thumbnailUrl ? (
                  <Image
                    src={template.thumbnailUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.fileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                    <Icons.check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-medium truncate">{displayName}</h3>
                {displayDescription && (
                  <p className="text-sm text-muted-foreground truncate">
                    {displayDescription}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTemplate && (
        <div className="flex justify-center">
          <Button onClick={handleContinue} size="lg">
            {t("continueToDetails")}
            <Icons.arrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
