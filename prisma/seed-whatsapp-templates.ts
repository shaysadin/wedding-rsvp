/**
 * Seed WhatsApp Templates
 *
 * Run with: npx ts-node prisma/seed-whatsapp-templates.ts
 * Or: npx tsx prisma/seed-whatsapp-templates.ts
 *
 * This seeds the formal style for all template types that have existing Content SIDs.
 * Other styles (friendly, short) need to be approved in Twilio first.
 */

import { PrismaClient, WhatsAppTemplateType } from "@prisma/client";

const prisma = new PrismaClient();

const EXISTING_TEMPLATES = [
  // Standard Invite - Formal (EXISTING)
  {
    type: WhatsAppTemplateType.INVITE,
    style: "formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    contentSid: "HX1a4aaf40cf5f7fd8a9a36f5c83226bd3",
    templateText: "copy_wedding_invitation",
    isActive: true,
    sortOrder: 0,
  },
  // Standard Reminder - Formal (EXISTING)
  {
    type: WhatsAppTemplateType.REMINDER,
    style: "formal",
    nameHe: "עדין",
    nameEn: "Gentle",
    contentSid: "HXb9855ad5e6b9797f3195574a090417ac",
    templateText: "copy_wedding_reminder",
    isActive: true,
    sortOrder: 0,
  },
  // Interactive Invite - Formal (EXISTING)
  {
    type: WhatsAppTemplateType.INTERACTIVE_INVITE,
    style: "formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    contentSid: "HXff76515d76bbe3e50656ef59bdf90fc6",
    templateText: "interactive_invite_card",
    isActive: true,
    sortOrder: 0,
  },
  // Interactive Reminder - Formal (EXISTING)
  {
    type: WhatsAppTemplateType.INTERACTIVE_REMINDER,
    style: "formal",
    nameHe: "עדין",
    nameEn: "Gentle",
    contentSid: "HXba2294e9683d133dfe92c62692e9d3f2",
    templateText: "interactive_reminder_card",
    isActive: true,
    sortOrder: 0,
  },
  // Image Invite - Formal (Same as Interactive Invite)
  {
    type: WhatsAppTemplateType.IMAGE_INVITE,
    style: "formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    contentSid: "HXff76515d76bbe3e50656ef59bdf90fc6", // Same as Interactive Invite
    templateText: "interactive_invite_card",
    isActive: true,
    sortOrder: 0,
  },
  // Event Day Reminder - Formal (EXISTING)
  {
    type: WhatsAppTemplateType.EVENT_DAY,
    style: "formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    contentSid: "HX80e0ff2024fb29d65878e002df31afd3",
    templateText: "event_day_reminder",
    isActive: true,
    sortOrder: 0,
  },
  // Thank You - Formal (EXISTING)
  {
    type: WhatsAppTemplateType.THANK_YOU,
    style: "formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    contentSid: "HX2e0cc26147f657e88a902b48349158b7",
    templateText: "thank_you_message",
    isActive: true,
    sortOrder: 0,
  },
  // Guest Count List - Formal (EXISTING)
  {
    type: WhatsAppTemplateType.GUEST_COUNT_LIST,
    style: "formal",
    nameHe: "רשמי",
    nameEn: "Formal",
    contentSid: "HX4322c2482da4bce43d001668b83234a6",
    templateText: "guest_count_list",
    isActive: true,
    sortOrder: 0,
  },
];

async function main() {
  console.log("Seeding WhatsApp templates...");

  for (const template of EXISTING_TEMPLATES) {
    const result = await prisma.whatsAppTemplate.upsert({
      where: {
        type_style: {
          type: template.type,
          style: template.style,
        },
      },
      create: template,
      update: {
        contentSid: template.contentSid,
        nameHe: template.nameHe,
        nameEn: template.nameEn,
        templateText: template.templateText,
        isActive: template.isActive,
      },
    });
    console.log(`✓ ${template.type} - ${template.style}: ${result.contentSid}`);
  }

  console.log("\nDone! Existing templates seeded.");
  console.log("\n=== TEMPLATES WITH EXISTING CONTENT SIDs ===");
  console.log("These are seeded with formal style and work out of the box.");
  console.log("\n=== TEMPLATES FROM LEGACY SETTINGS ===");
  console.log("These use Content SIDs from MessagingProviderSettings:");
  console.log("- CONFIRMATION -> whatsappConfirmationContentSid");
  console.log("- EVENT_DAY -> whatsappEventDayContentSid");
  console.log("- THANK_YOU -> whatsappThankYouContentSid");
  console.log("- GUEST_COUNT_LIST -> whatsappGuestCountListContentSid");
  console.log("- TABLE_ASSIGNMENT -> uses freeform message or whatsappTableAssignmentContentSid");
  console.log("\n=== TEMPLATES TO CREATE IN TWILIO ===");
  console.log("For friendly & short styles, create these in Twilio Content Template Builder:");
  console.log("- wedinex_invite_friendly, wedinex_invite_short");
  console.log("- wedinex_reminder_friendly, wedinex_reminder_short");
  console.log("- wedinex_interactive_invite_friendly, wedinex_interactive_invite_short");
  console.log("- wedinex_interactive_reminder_friendly, wedinex_interactive_reminder_short");
  console.log("- wedinex_confirmation_formal/friendly/short");
  console.log("- wedinex_event_day_formal/friendly/short");
  console.log("- wedinex_thank_you_formal/friendly/short");
  console.log("- wedinex_table_assignment_formal/friendly/short");
  console.log("- wedinex_guest_count_formal/friendly/short");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
