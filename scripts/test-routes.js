const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testNavigationRoute() {
  console.log('Testing navigation route...\n');

  const eventId = '98abny';

  try {
    // Try to find by navigationCode
    const event = await prisma.weddingEvent.findUnique({
      where: { navigationCode: eventId },
      select: { id: true, title: true, location: true, venue: true, navigationCode: true },
    });

    if (event) {
      console.log('✅ Event found by navigationCode:');
      console.log(JSON.stringify(event, null, 2));
    } else {
      console.log('❌ Event NOT found by navigationCode:', eventId);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

async function testTransportationRoute() {
  console.log('\n\nTesting transportation route...\n');

  const slug = '9hwkf7';

  try {
    // Try to find guest by transportationSlug
    const guest = await prisma.guest.findUnique({
      where: { transportationSlug: slug },
      select: {
        id: true,
        name: true,
        transportationSlug: true,
        weddingEvent: {
          select: { id: true, title: true }
        }
      },
    });

    if (guest) {
      console.log('✅ Guest found by transportationSlug:');
      console.log(JSON.stringify(guest, null, 2));
    } else {
      console.log('❌ Guest NOT found by transportationSlug:', slug);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

async function main() {
  try {
    await testNavigationRoute();
    await testTransportationRoute();
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
