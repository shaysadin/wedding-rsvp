const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTemplateStatus() {
  try {
    console.log('Fixing template approval status...\n');

    // Find templates that have ContentSid but are still in DRAFT status
    const templatesWithContentSid = await prisma.whatsAppTemplate.findMany({
      where: {
        contentSid: {
          not: null,
        },
        approvalStatus: 'DRAFT',
      },
    });

    console.log(`Found ${templatesWithContentSid.length} templates with ContentSid but DRAFT status\n`);

    // Update them to APPROVED status
    for (const template of templatesWithContentSid) {
      console.log(`Updating ${template.type} - ${template.style} to APPROVED`);

      await prisma.whatsAppTemplate.update({
        where: { id: template.id },
        data: {
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          isActive: true,
        },
      });
    }

    console.log('\n✅ Status fix complete!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixTemplateStatus();
