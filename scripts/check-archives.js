const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check user roles first
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        plan: true
      }
    });

    console.log('=== USERS AND ROLES ===\n');
    users.forEach((user, i) => {
      const isPlatformOwner = user.roles && user.roles.includes('ROLE_PLATFORM_OWNER');
      console.log(`${i + 1}. ${user.name || user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Plan: ${user.plan}`);
      console.log(`   Roles: ${user.roles ? user.roles.join(', ') : 'none'}`);
      console.log(`   🔑 Platform Owner: ${isPlatformOwner ? 'YES' : 'NO'}`);
      console.log('');
    });

    console.log('\n=== ARCHIVED EVENTS ===\n');

    // Check R2 archives (fully archived)
    const count = await prisma.eventArchive.count();
    const all = await prisma.eventArchive.findMany({
      select: {
        id: true,
        eventTitle: true,
        userId: true,
        archivedAt: true
      }
    });

    console.log('📦 R2 Archived events (fully archived):', count);
    all.forEach((archive, i) => {
      console.log(`  ${i + 1}. ${archive.eventTitle} (User: ${archive.userId})`);
    });

    // Check soft-archived events (marked as archived but still in database)
    const softArchived = await prisma.weddingEvent.findMany({
      where: { isArchived: true },
      select: {
        id: true,
        title: true,
        ownerId: true,
        archivedAt: true
      }
    });

    console.log(`\n🗄️  Soft-archived events (isArchived=true, still in DB): ${softArchived.length}`);
    softArchived.forEach((event, i) => {
      console.log(`  ${i + 1}. ${event.title} (Owner: ${event.ownerId}, Archived: ${event.archivedAt})`);
    });

    // Also check workspaces
    const workspaces = await prisma.workspace.findMany({
      include: {
        _count: {
          select: { events: true }
        },
        events: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    console.log('\n\nWorkspaces:');
    workspaces.forEach((ws) => {
      console.log(`- ${ws.name}: ${ws._count.events} events (actual events: ${ws.events.length})`);
      ws.events.forEach(e => console.log(`  * ${e.title}`));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
