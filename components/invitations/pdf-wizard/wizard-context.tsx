"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { EventType, InvitationFieldType } from "@prisma/client";

interface Template {
  id: string;
  name: string;
  nameHe: string;
  thumbnailUrl: string | null;
  pdfUrl: string;
  fields: TemplateField[];
}

interface TemplateField {
  id: string;
  fieldType: InvitationFieldType;
  label: string;
  labelHe: string | null;
  isRequired: boolean;
  defaultValue: string | null;
}

interface FieldValue {
  fieldType: InvitationFieldType;
  value: string;
}

interface WizardState {
  step: number;
  eventType: EventType | null;
  selectedTemplate: Template | null;
  fieldValues: FieldValue[];
  generatedPdfUrl: string | null;
  isGenerating: boolean;
}

interface WizardContextType extends WizardState {
  setStep: (step: number) => void;
  setEventType: (type: EventType) => void;
  setSelectedTemplate: (template: Template) => void;
  setFieldValues: (values: FieldValue[]) => void;
  setFieldValue: (fieldType: InvitationFieldType, value: string) => void;
  setGeneratedPdfUrl: (url: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  canProceed: () => boolean;
  reset: () => void;
}

const initialState: WizardState = {
  step: 1,
  eventType: null,
  selectedTemplate: null,
  fieldValues: [],
  generatedPdfUrl: null,
  isGenerating: false,
};

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export function PdfWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState);

  const setStep = (step: number) => {
    setState((prev) => ({ ...prev, step }));
  };

  const setEventType = (eventType: EventType) => {
    setState((prev) => ({ ...prev, eventType }));
  };

  const setSelectedTemplate = (template: Template) => {
    // Initialize field values with defaults
    const fieldValues = template.fields.map((field) => ({
      fieldType: field.fieldType,
      value: field.defaultValue || "",
    }));
    setState((prev) => ({ ...prev, selectedTemplate: template, fieldValues }));
  };

  const setFieldValues = (fieldValues: FieldValue[]) => {
    setState((prev) => ({ ...prev, fieldValues }));
  };

  const setFieldValue = (fieldType: InvitationFieldType, value: string) => {
    setState((prev) => {
      const existing = prev.fieldValues.find((f) => f.fieldType === fieldType);
      if (existing) {
        return {
          ...prev,
          fieldValues: prev.fieldValues.map((f) =>
            f.fieldType === fieldType ? { ...f, value } : f
          ),
        };
      }
      return {
        ...prev,
        fieldValues: [...prev.fieldValues, { fieldType, value }],
      };
    });
  };

  const setGeneratedPdfUrl = (generatedPdfUrl: string | null) => {
    setState((prev) => ({ ...prev, generatedPdfUrl }));
  };

  const setIsGenerating = (isGenerating: boolean) => {
    setState((prev) => ({ ...prev, isGenerating }));
  };

  const canProceed = () => {
    switch (state.step) {
      case 1:
        return state.eventType !== null;
      case 2:
        return state.selectedTemplate !== null;
      case 3:
        // Check all required fields have values
        if (!state.selectedTemplate) return false;
        return state.selectedTemplate.fields
          .filter((f) => f.isRequired)
          .every((f) => {
            const fieldValue = state.fieldValues.find(
              (v) => v.fieldType === f.fieldType
            );
            return fieldValue && fieldValue.value.trim() !== "";
          });
      case 4:
        return state.generatedPdfUrl !== null;
      default:
        return false;
    }
  };

  const reset = () => {
    setState(initialState);
  };

  return (
    <WizardContext.Provider
      value={{
        ...state,
        setStep,
        setEventType,
        setSelectedTemplate,
        setFieldValues,
        setFieldValue,
        setGeneratedPdfUrl,
        setIsGenerating,
        canProceed,
        reset,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}

export function usePdfWizard() {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error("usePdfWizard must be used within a PdfWizardProvider");
  }
  return context;
}
