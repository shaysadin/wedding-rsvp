/**
 * Add Transportation Slugs to Guests Without One
 *
 * Generates 6-character transportation slugs for guests who don't have one
 *
 * Run with: node scripts/add-missing-transportation-slugs.js
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
  console.log('🔄 Adding transportation slugs to guests...\n');

  try {
    // Get all guests without transportation slugs
    const guests = await prisma.guest.findMany({
      where: {
        transportationSlug: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (guests.length === 0) {
      console.log('✅ All guests already have transportation slugs!');
      return;
    }

    console.log(`📊 Found ${guests.length} guests without transportation slugs\n`);

    let successCount = 0;
    let failCount = 0;

    for (const guest of guests) {
      try {
        // Generate unique code
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

        // Update guest with transportation slug
        await prisma.guest.update({
          where: { id: guest.id },
          data: { transportationSlug: code },
        });

        console.log(`✅ ${guest.name}: ${code}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed for ${guest.name}:`, error.message);
        failCount++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   ✅ Success: ${successCount} guests`);
    console.log(`   ❌ Failed: ${failCount} guests`);
    console.log(`   📊 Total: ${guests.length} guests`);

    console.log('\n✅ Transportation slugs added successfully!');
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
