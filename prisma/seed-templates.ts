import { PrismaClient, BackgroundType, CardStyle } from "@prisma/client";

const prisma = new PrismaClient();

const systemTemplates = [
  {
    name: "קלאסי לבן",
    description: "עיצוב נקי וקלאסי עם רקע לבן",
    isSystem: true,
    backgroundType: BackgroundType.COLOR,
    backgroundColor: "#f8f9fa",
    cardStyle: CardStyle.ELEVATED,
    cardBackground: "#ffffff",
    cardBorderRadius: 16,
    cardPadding: 32,
    cardMaxWidth: 448,
    textColor: "#1a1a1a",
    showCalendar: true,
    showGoogleMaps: true,
    showEventDetails: true,
  },
  {
    name: "רומנטי ורוד",
    description: "עיצוב רך עם גווני ורוד",
    isSystem: true,
    backgroundType: BackgroundType.GRADIENT,
    primaryColor: "#fce7f3",
    secondaryColor: "#fbcfe8",
    cardStyle: CardStyle.GLASS,
    cardBackground: "#ffffff",
    cardBorderRadius: 24,
    cardPadding: 32,
    cardMaxWidth: 448,
    cardOpacity: 0.95,
    textColor: "#831843",
    showCalendar: true,
    showGoogleMaps: true,
    showEventDetails: true,
  },
  {
    name: "אלגנטי זהב",
    description: "עיצוב יוקרתי עם נגיעות זהב",
    isSystem: true,
    backgroundType: BackgroundType.COLOR,
    backgroundColor: "#1a1a1a",
    cardStyle: CardStyle.BORDERED,
    cardBackground: "#ffffff",
    cardBorderRadius: 8,
    cardPadding: 32,
    cardMaxWidth: 448,
    textColor: "#1a1a1a",
    primaryColor: "#d4af37",
    showCalendar: true,
    showGoogleMaps: true,
    showEventDetails: true,
  },
  {
    name: "טבע ירוק",
    description: "עיצוב טבעי עם גווני ירוק",
    isSystem: true,
    backgroundType: BackgroundType.GRADIENT,
    primaryColor: "#d1fae5",
    secondaryColor: "#a7f3d0",
    cardStyle: CardStyle.ELEVATED,
    cardBackground: "#ffffff",
    cardBorderRadius: 20,
    cardPadding: 28,
    cardMaxWidth: 448,
    textColor: "#064e3b",
    showCalendar: true,
    showGoogleMaps: true,
    showEventDetails: true,
  },
  {
    name: "מודרני מינימליסטי",
    description: "עיצוב נקי ומודרני",
    isSystem: true,
    backgroundType: BackgroundType.COLOR,
    backgroundColor: "#ffffff",
    cardStyle: CardStyle.FLAT,
    cardBackground: "#f3f4f6",
    cardBorderRadius: 4,
    cardPadding: 24,
    cardMaxWidth: 400,
    textColor: "#111827",
    showCalendar: true,
    showGoogleMaps: true,
    showEventDetails: true,
  },
  {
    name: "שקיעה רומנטית",
    description: "גרדיאנט חם של שקיעה",
    isSystem: true,
    backgroundType: BackgroundType.GRADIENT,
    primaryColor: "#fef3c7",
    secondaryColor: "#fecaca",
    cardStyle: CardStyle.GLASS,
    cardBackground: "#ffffff",
    cardBorderRadius: 16,
    cardPadding: 28,
    cardMaxWidth: 448,
    cardOpacity: 0.9,
    textColor: "#78350f",
    showCalendar: true,
    showGoogleMaps: true,
    showEventDetails: true,
  },
  {
    name: "כחול שלו",
    description: "עיצוב רגוע בגווני כחול",
    isSystem: true,
    backgroundType: BackgroundType.GRADIENT,
    primaryColor: "#dbeafe",
    secondaryColor: "#bfdbfe",
    cardStyle: CardStyle.ELEVATED,
    cardBackground: "#ffffff",
    cardBorderRadius: 16,
    cardPadding: 32,
    cardMaxWidth: 448,
    textColor: "#1e3a8a",
    showCalendar: true,
    showGoogleMaps: true,
    showEventDetails: true,
  },
  {
    name: "סגול מלכותי",
    description: "עיצוב מלכותי בגווני סגול",
    isSystem: true,
    backgroundType: BackgroundType.GRADIENT,
    primaryColor: "#e9d5ff",
    secondaryColor: "#d8b4fe",
    cardStyle: CardStyle.BORDERED,
    cardBackground: "#ffffff",
    cardBorderRadius: 12,
    cardPadding: 28,
    cardMaxWidth: 448,
    textColor: "#581c87",
    showCalendar: true,
    showGoogleMaps: true,
    showEventDetails: true,
  },
];

async function main() {
  console.log("Seeding system templates...");

  for (const template of systemTemplates) {
    // Check if template already exists
    const existing = await prisma.rsvpTemplate.findFirst({
      where: {
        name: template.name,
        isSystem: true,
      },
    });

    if (existing) {
      console.log(`Template "${template.name}" already exists, skipping...`);
      continue;
    }

    await prisma.rsvpTemplate.create({
      data: template,
    });
    console.log(`Created template: ${template.name}`);
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
