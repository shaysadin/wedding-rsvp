const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateStyles() {
  try {
    console.log('Starting template style migration...\n');

    // Map old style names to new ones
    const styleMapping = {
      'formal': 'style1',
      'friendly': 'style2',
      'short': 'style3',
    };

    // Get all templates with old style names
    const oldTemplates = await prisma.whatsAppTemplate.findMany({
      where: {
        style: {
          in: ['formal', 'friendly', 'short'],
        },
      },
    });

    console.log(`Found ${oldTemplates.length} templates with old style names\n`);

    // Update each template
    for (const template of oldTemplates) {
      const newStyle = styleMapping[template.style];

      if (newStyle) {
        console.log(`Updating ${template.type} - ${template.style} -> ${newStyle}`);

        await prisma.whatsAppTemplate.update({
          where: { id: template.id },
          data: {
            style: newStyle,
            // Update nameHe and nameEn to match new style names
            nameHe: `סגנון ${newStyle.replace('style', '')}`,
            nameEn: `Style ${newStyle.replace('style', '')}`,
          },
        });
      }
    }

    console.log('\n✅ Migration complete!');
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

migrateStyles();
