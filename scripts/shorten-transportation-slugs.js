/**
 * Shorten Transportation Slugs for Existing Guests
 *
 * Converts existing 12-character transportation slugs to 6-character codes
 * This makes transportation URLs much shorter: /transportation/abc123 instead of /transportation/BxY9z3K8pQw2
 *
 * Run with: node scripts/shorten-transportation-slugs.js
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
  console.log('🔄 Starting transportation slug shortening...\n');

  try {
    // Get all guests with transportation slugs longer than 6 characters
    const guests = await prisma.guest.findMany({
      where: {
        transportationSlug: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        transportationSlug: true,
      },
    });

    // Filter to only those with long slugs (12 chars)
    const guestsToUpdate = guests.filter(
      (g) => g.transportationSlug && g.transportationSlug.length > 6
    );

    if (guestsToUpdate.length === 0) {
      console.log('✅ All transportation slugs are already short!');
      return;
    }

    console.log(`📊 Found ${guestsToUpdate.length} guests with long transportation slugs\n`);

    let successCount = 0;
    let failCount = 0;

    for (const guest of guestsToUpdate) {
      try {
        // Generate unique short code
        let code;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          code = generateShortCode();
          const existing = await prisma.guest.findUnique({
            where: { transportationSlug: code },
          });

          if (!existing) {
            break;
          }

          attempts++;
        }

        if (attempts >= maxAttempts) {
          // Try with longer code if we can't find a unique 6-char one
          code = generateShortCode(7);
        }

        // Update guest with short transportation slug
        await prisma.guest.update({
          where: { id: guest.id },
          data: { transportationSlug: code },
        });

        console.log(`✅ ${guest.name}: ${guest.transportationSlug} → ${code}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed for ${guest.name}:`, error.message);
        failCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Success: ${successCount} guests`);
    console.log(`   ❌ Failed: ${failCount} guests`);
    console.log(`   📊 Total: ${guestsToUpdate.length} guests`);

    console.log('\n✅ Transportation slugs shortened successfully!');
    console.log('\nℹ️  Short URLs will now look like: /transportation/abc123');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
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
