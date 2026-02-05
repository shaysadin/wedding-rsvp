#!/usr/bin/env node

/**
 * Create Custom Guest Count List-Picker Content
 *
 * This script creates a custom Twilio Content API resource with type "twilio/list-picker"
 * for the guest count selection feature.
 *
 * WHY: List-pickers are free-form content (within 24-hour window) and do NOT require
 * WhatsApp template approval. This saves costs compared to using marketing templates.
 *
 * USAGE:
 * 1. Set environment variables: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
 * 2. Run: node scripts/create-guest-count-list-picker.js
 * 3. Copy the ContentSid from the output
 * 4. Update your database MessagingProviderSettings.whatsappGuestCountListContentSid
 *    with the new ContentSid
 *
 * The created content will include:
 * - Personalized greeting with guest name ({{1}})
 * - Event title ({{2}})
 * - Interactive list picker with options 1-10 guests
 * - Hebrew and English fallback text for non-supporting clients
 */

const https = require('https');

// Get credentials from environment
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ Error: Missing Twilio credentials');
  console.error('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables');
  console.error('\nExample:');
  console.error('  export TWILIO_ACCOUNT_SID=ACxxxx');
  console.error('  export TWILIO_AUTH_TOKEN=your_auth_token');
  console.error('  node scripts/create-guest-count-list-picker.js');
  process.exit(1);
}

// Create the list-picker content structure
const contentData = {
  friendly_name: 'wedinex_guest_count_list_picker',
  language: 'he', // Hebrew as primary language
  variables: {
    '1': 'Guest Name',
    '2': 'Event Title',
  },
  types: {
    // Main content: Interactive list-picker
    'twilio/list-picker': {
      body: 'שלום {{1}}! 👥\n\nכמה אורחים יגיעו ל{{2}}?',
      button: 'בחר מספר אורחים',
      items: [
        {
          id: '1',
          item: 'אורח 1',
          description: 'אורח אחד בלבד'
        },
        {
          id: '2',
          item: '2 אורחים',
          description: 'שני אורחים'
        },
        {
          id: '3',
          item: '3 אורחים',
          description: 'שלושה אורחים'
        },
        {
          id: '4',
          item: '4 אורחים',
          description: 'ארבעה אורחים'
        },
        {
          id: '5',
          item: '5 אורחים',
          description: 'חמישה אורחים'
        },
        {
          id: '6',
          item: '6 אורחים',
          description: 'שישה אורחים'
        },
        {
          id: '7',
          item: '7 אורחים',
          description: 'שבעה אורחים'
        },
        {
          id: '8',
          item: '8 אורחים',
          description: 'שמונה אורחים'
        },
        {
          id: '9',
          item: '9 אורחים',
          description: 'תשעה אורחים'
        },
        {
          id: '10',
          item: '10 אורחים',
          description: 'עשרה אורחים או יותר'
        }
      ]
    },
    // Fallback: Plain text for clients that don't support list-picker
    'twilio/text': {
      body: 'שלום {{1}}! 👥\n\nכמה אורחים יגיעו ל{{2}}?\n\nאנא השיבו במספר בלבד (1-10):\n1 - אורח 1\n2 - 2 אורחים\n3 - 3 אורחים\n4 - 4 אורחים\n5 - 5 אורחים\n6 - 6 אורחים\n7 - 7 אורחים\n8 - 8 אורחים\n9 - 9 אורחים\n10 - 10 אורחים או יותר\n\nפשוט שלחו את המספר (לדוגמה: 2)'
    }
  }
};

// Prepare the request
const postData = JSON.stringify(contentData);
const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

const options = {
  hostname: 'content.twilio.com',
  port: 443,
  path: '/v1/Content',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': `Basic ${credentials}`
  }
};

console.log('📝 Creating custom guest count list-picker content...\n');

// Make the request
const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (res.statusCode === 201) {
        console.log('✅ Success! Custom list-picker content created.\n');
        console.log('📋 Content Details:');
        console.log('   Friendly Name:', response.friendly_name);
        console.log('   Language:', response.language);
        console.log('   Type: twilio/list-picker (free-form interactive content)');
        console.log('\n🔑 ContentSid:', response.sid);
        console.log('\n📝 Next Steps:');
        console.log('   1. Copy the ContentSid above');
        console.log('   2. Update your database:');
        console.log('      UPDATE messaging_provider_settings');
        console.log(`      SET whatsapp_guest_count_list_content_sid = '${response.sid}';`);
        console.log('\n💡 Benefits:');
        console.log('   ✓ Interactive list picker UI (better UX than plain text)');
        console.log('   ✓ Free-form content (no WhatsApp template approval needed)');
        console.log('   ✓ Lower cost than marketing templates');
        console.log('   ✓ Can only be used within 24-hour customer service window');
        console.log('\n⚠️  Important Notes:');
        console.log('   • This content is NOT a WhatsApp-approved template');
        console.log('   • It can ONLY be sent within 24 hours after guest replies');
        console.log('   • Perfect for RSVP flow where guest already initiated conversation');
      } else {
        console.error('❌ Error creating content:');
        console.error('Status Code:', res.statusCode);
        console.error('Response:', JSON.stringify(response, null, 2));
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

// Send the request
req.write(postData);
req.end();
