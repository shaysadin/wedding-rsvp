const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMessages() {
  try {
    const events = await prisma.weddingEvent.findMany({
      select: {
        id: true,
        title: true,
        rsvpConfirmedMessage: true,
        rsvpDeclinedMessage: true
      }
    });

    console.log('=== WEDDING EVENTS - CUSTOM MESSAGES ===');
    events.forEach(event => {
      console.log(`\nEvent: ${event.title}`);
      console.log(`ID: ${event.id}`);
      console.log(`Confirmed Message: ${event.rsvpConfirmedMessage || '(not set - using default)'}`);
      console.log(`Declined Message: ${event.rsvpDeclinedMessage || '(not set - using default)'}`);
      console.log('---');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMessages();
