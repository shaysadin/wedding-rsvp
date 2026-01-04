import { InvitationFieldType } from "@prisma/client";

export interface FieldPosition {
  fieldType: InvitationFieldType;
  label: string;
  labelHe?: string | null;
  positionX: number;
  positionY: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textColor: string;
  textAlign: "left" | "center" | "right";
  maxWidth?: number | null;
  isRequired: boolean;
  defaultValue?: string | null;
}

export interface FieldValue {
  fieldType: InvitationFieldType;
  value: string;
}

export interface GenerationOptions {
  templatePdfUrl: string;
  fields: FieldPosition[];
  values: FieldValue[];
  locale?: "en" | "he";
}

export interface GenerationResult {
  success: boolean;
  pdfBytes?: Uint8Array;
  pdfUrl?: string;
  error?: string;
}

export interface FontConfig {
  name: string;
  regular: string;
  bold?: string;
}

// Available fonts with Hebrew support
export const AVAILABLE_FONTS: Record<string, FontConfig> = {
  Heebo: {
    name: "Heebo",
    regular: "/fonts/Heebo-Regular.ttf",
    bold: "/fonts/Heebo-Bold.ttf",
  },
  Assistant: {
    name: "Assistant",
    regular: "/fonts/Assistant-Regular.ttf",
    bold: "/fonts/Assistant-Bold.ttf",
  },
  Rubik: {
    name: "Rubik",
    regular: "/fonts/Rubik-Regular.ttf",
    bold: "/fonts/Rubik-Bold.ttf",
  },
};

// Default field configurations for different event types
export const DEFAULT_FIELD_CONFIGS: Record<
  string,
  Omit<FieldPosition, "positionX" | "positionY">[]
> = {
  WEDDING: [
    {
      fieldType: "COUPLE_NAMES",
      label: "Couple Names",
      labelHe: "שמות הזוג",
      fontSize: 32,
      fontFamily: "Heebo",
      fontWeight: "bold",
      textColor: "#1a1a1a",
      textAlign: "center",
      isRequired: true,
    },
    {
      fieldType: "EVENT_DATE",
      label: "Event Date",
      labelHe: "תאריך האירוע",
      fontSize: 24,
      fontFamily: "Heebo",
      fontWeight: "normal",
      textColor: "#333333",
      textAlign: "center",
      isRequired: true,
    },
    {
      fieldType: "EVENT_TIME",
      label: "Event Time",
      labelHe: "שעת האירוע",
      fontSize: 20,
      fontFamily: "Heebo",
      fontWeight: "normal",
      textColor: "#333333",
      textAlign: "center",
      isRequired: true,
    },
    {
      fieldType: "VENUE_NAME",
      label: "Venue",
      labelHe: "מקום האירוע",
      fontSize: 18,
      fontFamily: "Heebo",
      fontWeight: "normal",
      textColor: "#555555",
      textAlign: "center",
      maxWidth: 400,
      isRequired: true,
    },
  ],
  HENNA: [
    {
      fieldType: "GUEST_NAME",
      label: "Guest Name",
      labelHe: "שם האורח",
      fontSize: 28,
      fontFamily: "Heebo",
      fontWeight: "bold",
      textColor: "#1a1a1a",
      textAlign: "center",
      isRequired: true,
    },
    {
      fieldType: "EVENT_DATE",
      label: "Event Date",
      labelHe: "תאריך האירוע",
      fontSize: 22,
      fontFamily: "Heebo",
      fontWeight: "normal",
      textColor: "#333333",
      textAlign: "center",
      isRequired: true,
    },
    {
      fieldType: "VENUE_NAME",
      label: "Venue",
      labelHe: "מקום האירוע",
      fontSize: 18,
      fontFamily: "Heebo",
      fontWeight: "normal",
      textColor: "#555555",
      textAlign: "center",
      maxWidth: 400,
      isRequired: true,
    },
  ],
};
