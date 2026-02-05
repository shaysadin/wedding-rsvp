#!/usr/bin/env node

/**
 * Fix collaborator permissions across all action files
 *
 * This script updates all server actions to support collaborator access
 * by replacing owner-only checks with canAccessEvent helper
 */

const fs = require('fs');
const path = require('path');

const ACTION_FILES = [
  'seating.ts',
  'tasks.ts',
  'suppliers.ts',
  'notifications.ts',
  'rsvp-settings.ts',
  'invitations.ts',
  'bulk-notifications.ts',
  'generate-invitation.ts',
  'automations.ts',
];

const ACTIONS_DIR = path.join(__dirname, '..', 'actions');

console.log('\n🔧 Fixing Collaborator Permissions\n');
console.log('='.repeat(60));

let totalFixed = 0;

ACTION_FILES.forEach((filename) => {
  const filePath = path.join(ACTIONS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${filename} - File not found, skipping`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Check if canAccessEvent is already imported
  const hasImport = content.includes('import { canAccessEvent }') ||
                     content.includes('canAccessEvent') && content.includes('from "@/lib/permissions"');

  let changesCount = 0;

  // Add import if not present
  if (!hasImport && content.includes('from "@/lib/session"')) {
    content = content.replace(
      /import { getCurrentUser } from "@\/lib\/session";/,
      `import { getCurrentUser } from "@/lib/session";\nimport { canAccessEvent } from "@/lib/permissions";`
    );
    changesCount++;
  }

  // Pattern 1: Simple event ownership check
  // Before: const event = await prisma.weddingEvent.findFirst({ where: { id: eventId, ownerId: user.id } });
  // After: Use canAccessEvent helper

  // We'll add a comment for manual review since automatic replacement is complex
  const ownershipChecks = content.match(/where:\s*{\s*id:\s*[^,]+,\s*ownerId:\s*user\.id\s*}/g);

  if (ownershipChecks && ownershipChecks.length > 0) {
    changesCount += ownershipChecks.length;
  }

  // Write back if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filename} - Added canAccessEvent import`);
    totalFixed++;
  } else if (ownershipChecks && ownershipChecks.length > 0) {
    console.log(`⚠️  ${filename} - ${ownershipChecks.length} ownership checks need manual update`);
  } else if (hasImport) {
    console.log(`✓  ${filename} - Already has canAccessEvent import`);
  } else {
    console.log(`○  ${filename} - No changes needed`);
  }
});

console.log('='.repeat(60));
console.log(`\n📊 Summary: ${totalFixed} files updated`);
console.log('\n⚠️  NOTE: Ownership checks must be manually replaced with canAccessEvent()');
console.log('   Pattern to find: where: { id: ..., ownerId: user.id }');
console.log('   Replace with: canAccessEvent(eventId, user.id, "EDITOR") for writes');
console.log('   Replace with: canAccessEvent(eventId, user.id) for reads\n');
