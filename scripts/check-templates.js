const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTemplates() {
  try {
    const templates = await prisma.whatsAppTemplate.findMany({
      orderBy: [
        { type: 'asc' },
        { style: 'asc' },
      ],
      select: {
        id: true,
        type: true,
        style: true,
        contentSid: true,
        approvalStatus: true,
        isActive: true,
        nameHe: true,
        nameEn: true,
        twilioTemplateName: true,
      },
    });

    console.log(`\nFound ${templates.length} templates:\n`);

    templates.forEach((t) => {
      console.log(`${t.type} - ${t.style}:`);
      console.log(`  Name: ${t.nameHe} (${t.nameEn})`);
      console.log(`  ContentSid: ${t.contentSid || 'NULL'}`);
      console.log(`  Status: ${t.approvalStatus}`);
      console.log(`  Active: ${t.isActive}`);
      console.log(`  Twilio Name: ${t.twilioTemplateName || 'NULL'}`);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkTemplates();
