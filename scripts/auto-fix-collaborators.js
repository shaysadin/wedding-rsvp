#!/usr/bin/env node

/**
 * Automatically fix collaborator permissions in action files
 * Replaces owner-only checks with canAccessEvent helper
 */

const fs = require('fs');
const path = require('path');

const ACTIONS_DIR = path.join(__dirname, '..', 'actions');

const WRITE_FUNCTIONS = [
  'create', 'update', 'delete', 'add', 'remove', 'assign', 'move',
  'set', 'save', 'bulk', 'import', 'archive', 'unarchive', 'mark',
];

const READ_FUNCTIONS = [
  'get', 'fetch', 'check', 'find', 'list', 'view', 'read',
];

function isWriteOperation(functionName) {
  return WRITE_FUNCTIONS.some(prefix => functionName.toLowerCase().includes(prefix.toLowerCase()));
}

function isReadOperation(functionName) {
  return READ_FUNCTIONS.some(prefix => functionName.toLowerCase().includes(prefix.toLowerCase()));
}

function fixFile(filename) {
  const filePath = path.join(ACTIONS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${filename} - Not found`);
    return 0;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let changesCount = 0;

  // Pattern to match and replace
  // Match: where: { id: <var>, ownerId: user.id }
  // Also match the if (!event) check that follows

  const pattern = /(\s+)(\/\/ Verify.*ownership.*\n\s+)?const\s+(event|existingEvent)\s*=\s*await\s+prisma\.weddingEvent\.findFirst\(\{\s*\n\s+where:\s*\{\s*id:\s*([^,]+),\s*ownerId:\s*user\.id\s*\},?\s*\n(\s+[^}]*\n)*?\s+\}\);?\s*\n\s+if\s*\(\s*!\3\s*\)\s*\{\s*\n\s+return\s*\{\s*error:\s*"Event not found"\s*\};\s*\n\s+\}/g;

  content = content.replace(pattern, (match, indent, comment, varName, eventIdVar) => {
    changesCount++;
    // Default to EDITOR for safety
    const role = '"EDITOR"';
    return `${indent}// Verify event access (owner or collaborator with EDITOR role)\n${indent}const hasAccess = await canAccessEvent(${eventIdVar}, user.id, ${role});\n${indent}if (!hasAccess) {\n${indent}  return { error: "Event not found" };\n${indent}}`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${filename} - Fixed ${changesCount} ownership check(s)`);
    return changesCount;
  }

  console.log(`○  ${filename} - No automatic fixes applied`);
  return 0;
}

const files = [
  'seating.ts',
  'tasks.ts',
  'suppliers.ts',
  'notifications.ts',
  'rsvp-settings.ts',
  'invitations.ts',
  'bulk-notifications.ts',
  'generate-invitation.ts',
];

console.log('\n🔧 Auto-fixing Collaborator Permissions\n');
console.log('='.repeat(60));

let totalFixed = 0;
files.forEach(file => {
  totalFixed += fixFile(file);
});

console.log('='.repeat(60));
console.log(`\n✨ Fixed ${totalFixed} ownership checks automatically\n`);
