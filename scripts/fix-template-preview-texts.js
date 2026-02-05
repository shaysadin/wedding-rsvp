/**
 * Fix WhatsApp Template Preview Texts
 *
 * Updates all existing WhatsApp templates in the database with correct preview texts
 * from the template presets configuration file.
 *
 * Uses the 10-variable system:
 * {{1}} = Guest Name, {{2}} = Event Title, {{3}} = Venue Name, {{4}} = Venue Address
 * {{5}} = Event Date, {{6}} = Event Time, {{7}} = RSVP Link, {{8}} = Table Number
 * {{9}} = Transportation Link, {{10}} = Media URL
 *
 * Run with: node scripts/fix-template-preview-texts.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Template presets mapping (type + style -> preview text)
const TEMPLATE_PRESETS = {
  // INVITE Templates
  'INVITE:style1': {
    previewTextHe: `היי {{1}} 👋

אנחנו ממש מתרגשים להזמין אותך לחגוג איתנו את {{2}}!

נשמח מאוד לראות אותך שם 💙

לאישור הגעה ופרטים נוספים:
{{7}}

מחכים לך בשמחה!`,
  },
  'INVITE:style2': {
    previewTextHe: `שלום {{1}} 🎉

מוזמנים לחגוג איתנו את {{2}}!

📍 היכן? {{3}}, {{4}}

📅 מתי? {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נשמח לאישור הגעה כדי שנוכל לתכנן בשבילך את הערב המושלם.

מצפים לראותכם! 💫`,
  },
  'INVITE:style3': {
    previewTextHe: `שלום {{1}} 🎉

מוזמנים לחגוג איתנו את {{2}}!

📍 היכן? {{3}}, {{4}}

📅 מתי? {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

🚌 דאגנו לכם להסעות נוחות! לרישום להסעה:
{{9}}

נשמח לאישור הגעה כדי שנוכל לתכנן בשבילך את הערב המושלם.

מצפים לראותכם! 💫`,
  },

  // REMINDER Templates
  'REMINDER:style1': {
    previewTextHe: `היי {{1}} ⏰

רק רצינו להזכיר - {{2}} כבר ממש קרוב!

עדיין מחכים לאישור ההגעה שלך 💙

לחצו כאן:
{{7}}

נתראה בקרוב!`,
  },
  'REMINDER:style2': {
    previewTextHe: `שלום {{1}} 📢

תזכורת חמה - {{2}} כבר ממש מתקרב!

📍 המקום: {{3}}, {{4}}

📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

אם עדיין לא אישרת הגעה, נשמח שתעשה זאת עכשיו כדי שנוכל לדאוג לכל הפרטים בשבילך.

מצפים לראותכם! ✨`,
  },
  'REMINDER:style3': {
    previewTextHe: `שלום {{1}} 📢

תזכורת חמה - {{2}} כבר ממש מתקרב!

📍 המקום: {{3}}, {{4}}

📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

🚌 רוצים הסעה? נשמח לראותכם! לרישום:
{{9}}

אם עדיין לא אישרת הגעה, נשמח שתעשה זאת עכשיו כדי שנוכל לדאוג לכל הפרטים בשבילך.

מצפים לראותכם! ✨`,
  },

  // INTERACTIVE_INVITE Templates
  'INTERACTIVE_INVITE:style1': {
    previewTextHe: `היי {{1}} 🎊

אנחנו ממש שמחים להזמין אותך ל{{2}}!

🗺 ניווט למקום:
{{7}}

נשמח לדעת אם תוכלו להגיע`,
  },
  'INTERACTIVE_INVITE:style2': {
    previewTextHe: `שלום {{1}} 💌

מוזמנים לחגוג את {{2}}!

📍 איפה: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נשמח לדעת אם תוכלו להגיע`,
  },
  'INTERACTIVE_INVITE:style3': {
    previewTextHe: `שלום {{1}} 💌

מוזמנים לחגוג את {{2}}!

📍 איפה: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

🚌 יש הסעות! לרישום:
{{9}}

נשמח לדעת אם תוכלו להגיע`,
  },

  // INTERACTIVE_REMINDER Templates
  'INTERACTIVE_REMINDER:style1': {
    previewTextHe: `היי {{1}} ⏰

תזכורת חמה - {{2}} ממש מתקרב!

🗺 ניווט למקום:
{{7}}

נשמח לדעת אם תוכלו להגיע`,
  },
  'INTERACTIVE_REMINDER:style2': {
    previewTextHe: `שלום {{1}} 📢

{{2}} כבר ממש קרוב!

📍 המקום: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נשמח לדעת אם תוכלו להגיע`,
  },
  'INTERACTIVE_REMINDER:style3': {
    previewTextHe: `שלום {{1}} 📢

{{2}} כבר ממש קרוב!

📍 המקום: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

🚌 יש הסעות! לרישום:
{{9}}

נשמח לדעת אם תוכלו להגיע`,
  },

  // IMAGE_INVITE Template
  'IMAGE_INVITE:style1': {
    previewTextHe: `היי {{1}} 💌

שמחים להזמין אותך לחגוג איתנו את {{2}}!

📍 המקום: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

לאישור הגעה:
{{7}}

מצפים לראותך! ✨`,
  },

  // CONFIRMATION Template
  'CONFIRMATION:style1': {
    previewTextHe: `תודה רבה {{1}}! 🎉

קיבלנו את אישור ההגעה שלך ל{{2}}.

אנחנו ממש מתרגשים לחגוג איתך! 💙

📍 המקום: {{3}}, {{4}}
📅 מתי: {{5}} בשעה {{6}}

🗺 ניווט למקום:
{{7}}

נתראה בקרוב בשמחה! ✨`,
  },

  // EVENT_DAY Template
  'EVENT_DAY:style1': {
    previewTextHe: `בוקר טוב {{1}}! ☀️

היום הגדול הגיע - {{2}} היום! 🎊

📍 איפה: {{3}}, {{4}}
🕐 שעה: {{6}}
🪑 השולחן שלך: מספר {{8}}

🗺 ניווט מהיר למקום:
{{7}}

מצפים לראותך בקרוב ולחגוג ביחד! 💫`,
  },

  // THANK_YOU Template
  'THANK_YOU:style1': {
    previewTextHe: `שלום {{1}} 💙

תודה ענקית שחגגת איתנו את {{2}}!

הנוכחות שלך עשתה את הערב מיוחד ובלתי נשכח 💫

נשמח לשמוע איך היה לך ולקבל פידבק:
{{7}}

בברכה והוקרה רבה,
תודה שהיית חלק מהשמחה שלנו! 🎊`,
  },

  // TABLE_ASSIGNMENT Template
  'TABLE_ASSIGNMENT:style1': {
    previewTextHe: `שלום {{1}} 🪑

שובצת לשולחן באירוע {{2}}!

🪑 השולחן שלך: מספר {{8}}

📍 המקום: {{3}}, {{4}}

🕐 שעת הגעה מומלצת: {{6}}

🗺 ניווט נוח למקום:
{{7}}

נתראה שם! 🎉`,
  },

  // GUEST_COUNT_LIST Template
  'GUEST_COUNT_LIST:style1': {
    previewTextHe: `שלום {{1}} 👥

כמה אנשים יגיעו איתך ל{{2}}?

נשמח לקבל את המספר המדויק כדי שנוכל להכין את הכל בשבילכם 💙

לפרטים נוספים:
{{7}}

תודה! 🙏`,
  },
};

async function main() {
  console.log('🔄 Starting template preview text migration...\n');

  try {
    // Fetch all WhatsApp templates
    const templates = await prisma.whatsAppTemplate.findMany({
      select: {
        id: true,
        type: true,
        style: true,
        nameHe: true,
        previewTextHe: true,
      },
    });

    console.log(`📊 Found ${templates.length} templates in database\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const template of templates) {
      const key = `${template.type}:${template.style}`;
      const preset = TEMPLATE_PRESETS[key];

      if (!preset) {
        console.log(`⚠️  No preset found for: ${template.nameHe} (${key})`);
        notFoundCount++;
        continue;
      }

      // Check if preview text needs updating
      if (template.previewTextHe === preset.previewTextHe) {
        console.log(`✅ Already up to date: ${template.nameHe} (${template.type}:${template.style})`);
        skippedCount++;
        continue;
      }

      // Update the template
      await prisma.whatsAppTemplate.update({
        where: { id: template.id },
        data: {
          previewTextHe: preset.previewTextHe,
          previewText: preset.previewTextHe, // Also update English preview
        },
      });

      console.log(`✨ Updated: ${template.nameHe} (${template.type}:${template.style})`);
      updatedCount++;
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Updated: ${updatedCount} templates`);
    console.log(`   ⏭️  Skipped (already correct): ${skippedCount} templates`);
    console.log(`   ⚠️  No preset found: ${notFoundCount} templates`);
    console.log(`   📊 Total processed: ${templates.length} templates`);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
