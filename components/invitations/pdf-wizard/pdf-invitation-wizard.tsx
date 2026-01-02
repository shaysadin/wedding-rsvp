"use client";

import { useTranslations } from "next-intl";

import { PdfWizardProvider, usePdfWizard } from "./wizard-context";
import { EventTypeStep } from "./steps/event-type-step";
import { TemplateGalleryStep } from "./steps/template-gallery-step";
import { InformationFormStep } from "./steps/information-form-step";
import { GenerationStep } from "./steps/generation-step";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/shared/icons";

const STEPS = [
  { id: 1, labelKey: "step1", icon: "calendar" as const },
  { id: 2, labelKey: "step2", icon: "layoutGrid" as const },
  { id: 3, labelKey: "step3", icon: "edit" as const },
  { id: 4, labelKey: "step4", icon: "download" as const },
];

function StepIndicator() {
  const t = useTranslations("pdfInvitations.steps");
  const { step } = usePdfWizard();

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {STEPS.map((s, index) => {
          const Icon = Icons[s.icon];
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={s.id} className="flex items-center">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-primary bg-primary/10 text-primary",
                    !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground/50"
                  )}
                >
                  {isCompleted ? (
                    <Icons.check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 font-medium whitespace-nowrap",
                    isActive && "text-primary",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground/50"
                  )}
                >
                  {t(s.labelKey)}
                </span>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    "w-12 md:w-24 h-0.5 mx-2 mb-6",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WizardContent() {
  const { step } = usePdfWizard();

  switch (step) {
    case 1:
      return <EventTypeStep />;
    case 2:
      return <TemplateGalleryStep />;
    case 3:
      return <InformationFormStep />;
    case 4:
      return <GenerationStep />;
    default:
      return <EventTypeStep />;
  }
}

export function PdfInvitationWizard() {
  return (
    <PdfWizardProvider>
      <div className="w-full max-w-6xl mx-auto">
        <StepIndicator />
        <WizardContent />
      </div>
    </PdfWizardProvider>
  );
}
