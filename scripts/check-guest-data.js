const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    // Find the guest "שי סדינה"
    const guest = await prisma.guest.findFirst({
      where: {
        name: {
          contains: 'שי סדינה'
        }
      },
      select: {
        id: true,
        name: true,
        transportationSlug: true,
        weddingEvent: {
          select: {
            id: true,
            title: true,
            navigationCode: true
          }
        }
      }
    });

    if (guest) {
      console.log('Guest found:');
      console.log(JSON.stringify(guest, null, 2));

      console.log('\n---');
      console.log('Transportation slug:', guest.transportationSlug || 'MISSING ❌');
      console.log('Navigation code:', guest.weddingEvent.navigationCode || 'MISSING ❌');
    } else {
      console.log('Guest not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
