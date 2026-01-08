/**
 * Migration Script: Create Default Workspaces for Existing Users
 *
 * This script creates a default workspace for all users who don't have one yet.
 * It's safe to run multiple times - it will skip users who already have workspaces.
 *
 * Run with: npx tsx scripts/migrate-default-workspaces.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateDefaultWorkspaces() {
  console.log("🚀 Starting workspace migration...\n");

  try {
    // Find all users who don't have any workspaces
    const usersWithoutWorkspaces = await prisma.user.findMany({
      where: {
        workspaces: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    console.log(`📊 Found ${usersWithoutWorkspaces.length} users without workspaces\n`);

    if (usersWithoutWorkspaces.length === 0) {
      console.log("✅ All users already have workspaces. Nothing to do!");
      return;
    }

    let created = 0;
    let failed = 0;

    for (const user of usersWithoutWorkspaces) {
      try {
        // Generate a unique slug
        const slug = `workspace-${user.id.slice(-8)}`;

        // Use user's name or email prefix as workspace name
        const workspaceName = user.name || user.email?.split("@")[0] || "My Events";

        // Check if slug already exists (edge case)
        const existingSlug = await prisma.workspace.findUnique({
          where: { slug },
        });

        const finalSlug = existingSlug
          ? `${slug}-${Date.now().toString(36)}`
          : slug;

        // Create the default workspace
        await prisma.workspace.create({
          data: {
            name: workspaceName,
            slug: finalSlug,
            ownerId: user.id,
            isDefault: true,
          },
        });

        created++;
        console.log(`✅ Created workspace for: ${user.email} (${workspaceName})`);
      } catch (error) {
        failed++;
        console.error(`❌ Failed to create workspace for: ${user.email}`, error);
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 Migration Complete!`);
    console.log(`   ✅ Created: ${created} workspaces`);
    if (failed > 0) {
      console.log(`   ❌ Failed: ${failed} users`);
    }
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateDefaultWorkspaces()
  .then(() => {
    console.log("\n👋 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration error:", error);
    process.exit(1);
  });
