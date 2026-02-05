/**
 * Add Navigation Codes to Existing Events
 *
 * Generates short 6-character codes for all events that don't have one
 * This makes navigation URLs much shorter: /n/abc123 instead of /n/cmivxaj5q0001g0y9xzw9zirl
 *
 * Run with: node scripts/add-navigation-codes.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Generate a random short code (6 characters, URL-safe, no confusing chars)
function generateShortCode(length = 6) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // No 0, O, l, 1
  let code = '';

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

async function main() {
  console.log('🔄 Starting navigation code generation...\\n');

  try {
    // Get all events without navigation codes
    const events = await prisma.weddingEvent.findMany({
      where: {
        navigationCode: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (events.length === 0) {
      console.log('✅ All events already have navigation codes!');
      return;
    }

    console.log(`📊 Found ${events.length} events without navigation codes\\n`);

    let successCount = 0;
    let failCount = 0;

    for (const event of events) {
      try {
        // Generate unique code
        let code;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          code = generateShortCode();
          const existing = await prisma.weddingEvent.findUnique({
            where: { navigationCode: code },
          });

          if (!existing) {
            break;
          }

          attempts++;
        }

        if (attempts >= maxAttempts) {
          // Try with longer code
          code = generateShortCode(7);
        }

        // Update event with navigation code
        await prisma.weddingEvent.update({
          where: { id: event.id },
          data: { navigationCode: code },
        });

        console.log(`✅ ${event.title}: ${code}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed for ${event.title}:`, error.message);
        failCount++;
      }
    }

    console.log('\\n📈 Summary:');
    console.log(`   ✅ Success: ${successCount} events`);
    console.log(`   ❌ Failed: ${failCount} events`);
    console.log(`   📊 Total: ${events.length} events`);

    console.log('\\n✅ Navigation codes added successfully!');
    console.log('\\nℹ️  Short URLs will now look like: /n/abc123');
  } catch (error) {
    console.error('\\n❌ Script failed:', error);
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
