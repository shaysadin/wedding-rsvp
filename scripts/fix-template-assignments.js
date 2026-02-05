/**
 * Fix Template Assignments
 *
 * Issue: INTERACTIVE_INVITE and IMAGE_INVITE templates are swapped
 * Solution:
 * 1. The template currently assigned to IMAGE_INVITE should be INTERACTIVE_INVITE
 * 2. Unassign IMAGE_INVITE (will create proper template later)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTemplateAssignments() {
  try {
    console.log('🔍 Checking current template assignments...\n');

    // Find INTERACTIVE_INVITE template
    const interactiveInvite = await prisma.whatsAppTemplate.findFirst({
      where: {
        type: 'INTERACTIVE_INVITE',
        isActive: true,
      },
    });

    // Find IMAGE_INVITE template
    const imageInvite = await prisma.whatsAppTemplate.findFirst({
      where: {
        type: 'IMAGE_INVITE',
        isActive: true,
      },
    });

    console.log('Current assignments:');
    console.log('INTERACTIVE_INVITE:', interactiveInvite ? {
      id: interactiveInvite.id,
      nameHe: interactiveInvite.nameHe,
      contentSid: interactiveInvite.contentSid,
      style: interactiveInvite.style,
    } : 'Not assigned');
    console.log('IMAGE_INVITE:', imageInvite ? {
      id: imageInvite.id,
      nameHe: imageInvite.nameHe,
      contentSid: imageInvite.contentSid,
      style: imageInvite.style,
    } : 'Not assigned');
    console.log('');

    if (!imageInvite) {
      console.log('❌ No IMAGE_INVITE template found. Nothing to fix.');
      return;
    }

    console.log('🔄 Fixing assignments...\n');

    // Step 1: If INTERACTIVE_INVITE exists, delete it (it's the wrong one)
    if (interactiveInvite) {
      console.log(`Deleting incorrect INTERACTIVE_INVITE template (ID: ${interactiveInvite.id})...`);
      await prisma.whatsAppTemplate.delete({
        where: { id: interactiveInvite.id },
      });
    }

    // Step 2: Change IMAGE_INVITE to INTERACTIVE_INVITE
    console.log(`Converting IMAGE_INVITE (ID: ${imageInvite.id}) to INTERACTIVE_INVITE...`);
    await prisma.whatsAppTemplate.update({
      where: { id: imageInvite.id },
      data: {
        type: 'INTERACTIVE_INVITE',
        nameHe: imageInvite.nameHe.replace('תמונה', 'אינטראקטיבית').replace('מדיה', 'כפתורים'),
        nameEn: imageInvite.nameEn.replace('Image', 'Interactive').replace('Media', 'Buttons'),
      },
    });

    console.log('');
    console.log('✅ Template assignments fixed!');
    console.log('');
    console.log('Summary:');
    console.log('- INTERACTIVE_INVITE: Now correctly assigned');
    console.log('- IMAGE_INVITE: Unassigned (ready for new template)');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixTemplateAssignments()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });
