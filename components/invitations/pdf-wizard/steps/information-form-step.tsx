"use client";

import { useTranslations, useLocale } from "next-intl";
import { InvitationFieldType } from "@prisma/client";

import { usePdfWizard } from "../wizard-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

const FIELD_TYPE_ICONS: Record<InvitationFieldType, keyof typeof Icons> = {
  GUEST_NAME: "user",
  EVENT_DATE: "calendar",
  EVENT_TIME: "clock",
  VENUE: "mapPin",
  COUPLE_NAMES: "heart",
  CUSTOM: "edit",
};

const FIELD_TYPE_PLACEHOLDERS: Record<InvitationFieldType, string> = {
  GUEST_NAME: "John & Jane Doe",
  EVENT_DATE: "January 15, 2026",
  EVENT_TIME: "18:00",
  VENUE: "The Grand Ballroom",
  COUPLE_NAMES: "Sarah & Michael",
  CUSTOM: "",
};

export function InformationFormStep() {
  const t = useTranslations("pdfInvitations");
  const locale = useLocale();
  const {
    selectedTemplate,
    fieldValues,
    setFieldValue,
    setStep,
    canProceed,
  } = usePdfWizard();

  if (!selectedTemplate) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{t("noTemplateSelected")}</p>
        <Button variant="outline" onClick={() => setStep(2)} className="mt-4">
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          {t("backToTemplates")}
        </Button>
      </div>
    );
  }

  const handleContinue = () => {
    if (canProceed()) {
      setStep(4);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">{t("enterDetails")}</h2>
        <p className="text-muted-foreground">{t("enterDetailsDescription")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "he" ? selectedTemplate.nameHe : selectedTemplate.name}
          </CardTitle>
          <CardDescription>{t("fillInFields")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedTemplate.fields.map((field) => {
            const Icon = Icons[FIELD_TYPE_ICONS[field.fieldType as InvitationFieldType] || "edit"];
            const displayLabel = locale === "he" && field.labelHe ? field.labelHe : field.label;
            const currentValue = fieldValues.find(
              (v) => v.fieldType === field.fieldType
            )?.value || "";
            const placeholder = FIELD_TYPE_PLACEHOLDERS[field.fieldType as InvitationFieldType] || "";

            return (
              <div key={field.id} className="space-y-2">
                <Label
                  htmlFor={field.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {displayLabel}
                  {field.isRequired && (
                    <span className="text-destructive">*</span>
                  )}
                </Label>
                <Input
                  id={field.id}
                  value={currentValue}
                  onChange={(e) =>
                    setFieldValue(field.fieldType as InvitationFieldType, e.target.value)
                  }
                  placeholder={placeholder}
                  dir={locale === "he" ? "rtl" : "ltr"}
                  className={locale === "he" ? "text-right" : "text-left"}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Button>
        <Button onClick={handleContinue} disabled={!canProceed()}>
          {t("generateInvitation")}
          <Icons.arrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
