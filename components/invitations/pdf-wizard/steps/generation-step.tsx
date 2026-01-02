"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

import { usePdfWizard } from "../wizard-context";
import { generatePdfInvitation } from "@/actions/invitation-templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

export function GenerationStep() {
  const t = useTranslations("pdfInvitations");
  const locale = useLocale();
  const params = useParams();
  const eventId = params.eventId as string;

  const {
    selectedTemplate,
    fieldValues,
    generatedPdfUrl,
    isGenerating,
    setGeneratedPdfUrl,
    setIsGenerating,
    setStep,
    reset,
  } = usePdfWizard();

  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    // Auto-generate when step is reached
    if (!hasGenerated && selectedTemplate && fieldValues.length > 0) {
      handleGenerate();
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedTemplate || isGenerating) return;

    setIsGenerating(true);
    setGeneratedPdfUrl(null);

    try {
      const result = await generatePdfInvitation(
        eventId,
        selectedTemplate.id,
        fieldValues
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.pdfUrl) {
        setGeneratedPdfUrl(result.pdfUrl);
        setHasGenerated(true);
        toast.success(t("generationSuccess"));
      }
    } catch (error) {
      toast.error(t("generationFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedPdfUrl) {
      window.open(generatedPdfUrl, "_blank");
    }
  };

  const handleStartOver = () => {
    reset();
    setStep(1);
  };

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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">
          {isGenerating ? t("generating") : generatedPdfUrl ? t("readyToDownload") : t("generateYourInvitation")}
        </h2>
        <p className="text-muted-foreground">
          {isGenerating
            ? t("generatingDescription")
            : generatedPdfUrl
            ? t("downloadDescription")
            : t("clickToGenerate")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("preview")}</CardTitle>
            <CardDescription>
              {locale === "he" ? selectedTemplate.nameHe : selectedTemplate.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden border">
              {selectedTemplate.thumbnailUrl ? (
                <Image
                  src={selectedTemplate.thumbnailUrl}
                  alt={locale === "he" ? selectedTemplate.nameHe : selectedTemplate.name}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icons.fileText className="h-16 w-16 text-muted-foreground" />
                </div>
              )}

              {/* Overlay while generating */}
              {isGenerating && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <Icons.spinner className="h-10 w-10 animate-spin mx-auto text-primary" />
                    <p className="text-sm font-medium">{t("generatingPdf")}</p>
                  </div>
                </div>
              )}

              {/* Success checkmark */}
              {generatedPdfUrl && !isGenerating && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <div className="text-center space-y-3">
                    <div className="bg-green-500 rounded-full p-3 mx-auto w-fit">
                      <Icons.check className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-sm font-medium text-green-600">{t("generated")}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("yourDetails")}</CardTitle>
            <CardDescription>{t("detailsSummary")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fieldValues.map((fv, index) => {
              const field = selectedTemplate.fields.find(
                (f) => f.fieldType === fv.fieldType
              );
              if (!field) return null;

              const displayLabel = locale === "he" && field.labelHe ? field.labelHe : field.label;

              return (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{displayLabel}</span>
                  <span className="font-medium">{fv.value || "-"}</span>
                </div>
              );
            })}

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              {generatedPdfUrl ? (
                <>
                  <Button className="w-full" size="lg" onClick={handleDownload}>
                    <Icons.download className="mr-2 h-5 w-5" />
                    {t("downloadPdf")}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <Icons.refresh className="mr-2 h-4 w-4" />
                    {t("regenerate")}
                  </Button>
                </>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Icons.spinner className="mr-2 h-5 w-5 animate-spin" />
                      {t("generating")}
                    </>
                  ) : (
                    <>
                      <Icons.fileText className="mr-2 h-5 w-5" />
                      {t("generateNow")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={() => setStep(3)}>
          <Icons.arrowLeft className="mr-2 h-4 w-4" />
          {t("editDetails")}
        </Button>
        <Button variant="ghost" onClick={handleStartOver}>
          <Icons.refresh className="mr-2 h-4 w-4" />
          {t("startOver")}
        </Button>
      </div>
    </div>
  );
}
