/**
 * Sync WhatsApp Template Previews
 *
 * This script:
 * 1. Fetches Twilio credentials from the database
 * 2. Fetches all WhatsApp templates from Twilio Content API
 * 3. Updates their preview text in the database with actual template content
 * 4. Optionally syncs those previews to SMS templates
 *
 * Requirements:
 * - Twilio credentials must be configured in admin messaging settings
 * - Database connection (DATABASE_URL environment variable)
 *
 * Usage:
 *   node scripts/sync-whatsapp-previews.js
 *   node scripts/sync-whatsapp-previews.js --sync-sms
 */

const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');

const prisma = new PrismaClient();

// Twilio client (will be initialized after fetching credentials from DB)
let client = null;

// Parse command line arguments
const args = process.argv.slice(2);
const shouldSyncSms = args.includes('--sync-sms');

/**
 * Extract text from Twilio template body
 */
function extractTemplateText(twilioTemplate) {
  try {
    const types = twilioTemplate.types;

    // Try twilio/text first (standard templates)
    if (types && types['twilio/text']) {
      const body = types['twilio/text'].body;
      if (body) return body;
    }

    // Try twilio/call-to-action (interactive buttons)
    if (types && types['twilio/call-to-action']) {
      const cta = types['twilio/call-to-action'];
      if (cta.body) return cta.body;
    }

    // Try twilio/quick-reply (quick reply buttons)
    if (types && types['twilio/quick-reply']) {
      const qr = types['twilio/quick-reply'];
      if (qr.body) return qr.body;
    }

    // Try twilio/card (media cards)
    if (types && types['twilio/card']) {
      const card = types['twilio/card'];
      if (card.body) return card.body;
    }

    // Try twilio/list-picker (list selection)
    if (types && types['twilio/list-picker']) {
      const list = types['twilio/list-picker'];
      if (list.body) return list.body;
    }

    // Try generic content type
    if (types && types['twilio/content']) {
      const content = types['twilio/content'];
      if (content.body) return content.body;
    }

    // Try to find body in any type
    for (const typeKey in types) {
      if (types[typeKey] && types[typeKey].body) {
        return types[typeKey].body;
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting template text:', error);
    return null;
  }
}

/**
 * Map WhatsApp template type to SMS template type
 */
function mapWhatsAppTypeToSms(whatsappType) {
  // Map WhatsApp types to SMS types
  const typeMap = {
    'INVITE': 'INVITE',
    'INTERACTIVE_INVITE': 'INVITE',
    'IMAGE_INVITE': 'INVITE',
    'REMINDER': 'REMINDER',
    'INTERACTIVE_REMINDER': 'REMINDER',
    'EVENT_DAY': 'EVENT_DAY',
    'THANK_YOU': 'THANK_YOU',
    'TABLE_ASSIGNMENT': 'EVENT_DAY',
    'CONFIRMATION': 'REMINDER',
    'GUEST_COUNT_LIST': 'REMINDER',
  };

  return typeMap[whatsappType] || null;
}

/**
 * Map style names between WhatsApp and SMS
 */
function mapWhatsAppStyleToSms(whatsappStyle) {
  // Map WhatsApp styles to SMS styles
  const styleMap = {
    'formal': 'style1',      // Formal -> Normal
    'friendly': 'style2',    // Friendly -> Informative
    'short': 'style3',       // Short -> Transportation/Quick
  };

  return styleMap[whatsappStyle] || whatsappStyle;
}

/**
 * Fetch template from Twilio by contentSid
 */
async function fetchTwilioTemplate(contentSid) {
  try {
    const template = await client.content.v1.contents(contentSid).fetch();
    return template;
  } catch (error) {
    console.error(`Error fetching template ${contentSid}:`, error.message);
    return null;
  }
}

/**
 * Update WhatsApp template preview in database
 */
async function updateWhatsAppPreview(template, twilioTemplate) {
  try {
    const templateText = extractTemplateText(twilioTemplate);

    if (!templateText) {
      console.log(`⚠️  No template text found for ${template.nameEn} (${template.contentSid})`);
      return false;
    }

    // Detect language - if template has Hebrew characters, it's Hebrew
    const hasHebrew = /[\u0590-\u05FF]/.test(templateText);

    const updateData = hasHebrew ? {
      previewTextHe: templateText,
    } : {
      previewText: templateText,
    };

    await prisma.whatsAppTemplate.update({
      where: { id: template.id },
      data: updateData,
    });

    console.log(`✅ Updated preview for ${template.nameEn} (${hasHebrew ? 'Hebrew' : 'English'})`);
    return true;
  } catch (error) {
    console.error(`Error updating preview for ${template.nameEn}:`, error.message);
    return false;
  }
}

/**
 * Sync WhatsApp preview to SMS templates
 * Only syncs non-interactive versions (INVITE, REMINDER, EVENT_DAY, THANK_YOU)
 */
async function syncToSmsTemplates(whatsappTemplate) {
  try {
    // Skip interactive templates - SMS should use non-interactive versions
    const interactiveTypes = ['INTERACTIVE_INVITE', 'INTERACTIVE_REMINDER', 'IMAGE_INVITE', 'GUEST_COUNT_LIST', 'TABLE_ASSIGNMENT', 'CONFIRMATION'];
    if (interactiveTypes.includes(whatsappTemplate.type)) {
      console.log(`⏭️  Skipping interactive/special template: ${whatsappTemplate.type}`);
      return 0;
    }

    const smsType = mapWhatsAppTypeToSms(whatsappTemplate.type);
    const smsStyle = mapWhatsAppStyleToSms(whatsappTemplate.style);

    if (!smsType) {
      console.log(`⚠️  No SMS mapping for WhatsApp type: ${whatsappTemplate.type}`);
      return 0;
    }

    // Get the preview text
    const previewTextHe = whatsappTemplate.previewTextHe;
    const previewText = whatsappTemplate.previewText;

    if (!previewTextHe && !previewText) {
      console.log(`⚠️  No preview text to sync for ${whatsappTemplate.nameEn}`);
      return 0;
    }

    // Find matching SMS templates (across all events with this type and style)
    const smsTemplates = await prisma.eventSmsTemplate.findMany({
      where: {
        type: smsType,
        style: smsStyle,
        isDefault: true, // Only update default templates
      },
    });

    if (smsTemplates.length === 0) {
      console.log(`ℹ️  No matching SMS templates found for ${smsType} - ${smsStyle}`);
      return 0;
    }

    // Update each SMS template
    let updated = 0;
    for (const smsTemplate of smsTemplates) {
      await prisma.eventSmsTemplate.update({
        where: { id: smsTemplate.id },
        data: {
          messageBodyHe: previewTextHe || smsTemplate.messageBodyHe,
          messageBodyEn: previewText || smsTemplate.messageBodyEn,
        },
      });
      updated++;
    }

    console.log(`📋 Synced to ${updated} SMS template(s) (${smsType} - ${smsStyle})`);
    return updated;
  } catch (error) {
    console.error(`Error syncing to SMS templates:`, error.message);
    return 0;
  }
}

/**
 * Initialize Twilio client from database credentials
 */
async function initializeTwilioClient() {
  try {
    // Fetch messaging provider settings from database
    const settings = await prisma.messagingProviderSettings.findFirst();

    if (!settings) {
      console.error('❌ No messaging provider settings found in database');
      console.error('   Please configure Twilio credentials in the admin panel first');
      process.exit(1);
    }

    const accountSid = settings.whatsappApiKey;
    const authToken = settings.whatsappApiSecret;

    if (!accountSid || !authToken) {
      console.error('❌ Twilio credentials not configured in database');
      console.error('   Please set WhatsApp API Key (Account SID) and API Secret (Auth Token) in admin panel');
      process.exit(1);
    }

    // Initialize Twilio client
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio client initialized from database credentials\n');
  } catch (error) {
    console.error('❌ Error initializing Twilio client:', error.message);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting WhatsApp template preview sync...\n');

  try {
    // Initialize Twilio client from database
    await initializeTwilioClient();

    // Fetch all WhatsApp templates from database that have a contentSid
    const whatsappTemplates = await prisma.whatsAppTemplate.findMany({
      where: {
        contentSid: {
          not: null,
        },
      },
      orderBy: [
        { type: 'asc' },
        { style: 'asc' },
      ],
    });

    console.log(`📊 Found ${whatsappTemplates.length} WhatsApp templates with contentSid\n`);

    if (whatsappTemplates.length === 0) {
      console.log('ℹ️  No templates to sync');
      return;
    }

    let updatedCount = 0;
    let syncedCount = 0;

    for (const template of whatsappTemplates) {
      console.log(`\n🔄 Processing: ${template.nameEn} (${template.type} - ${template.style})`);
      console.log(`   ContentSid: ${template.contentSid}`);

      // Fetch template from Twilio
      const twilioTemplate = await fetchTwilioTemplate(template.contentSid);

      if (!twilioTemplate) {
        console.log('   ❌ Failed to fetch from Twilio');
        continue;
      }

      // Update preview in database
      const updated = await updateWhatsAppPreview(template, twilioTemplate);
      if (updated) {
        updatedCount++;

        // If sync-sms flag is set, sync to SMS templates
        if (shouldSyncSms) {
          // Fetch updated template to get new preview
          const updatedTemplate = await prisma.whatsAppTemplate.findUnique({
            where: { id: template.id },
          });

          if (updatedTemplate) {
            const synced = await syncToSmsTemplates(updatedTemplate);
            syncedCount += synced;
          }
        }
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n✨ Summary:');
    console.log(`   ${updatedCount}/${whatsappTemplates.length} WhatsApp templates updated`);
    if (shouldSyncSms) {
      console.log(`   ${syncedCount} SMS templates synced`);
    }
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
