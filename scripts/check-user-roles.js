// Quick script to check and update user roles
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      roles: true,
    },
  });

  console.log('\n=== Current Users and Roles ===\n');
  users.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`  Single role: ${user.role}`);
    console.log(`  Roles array: ${JSON.stringify(user.roles)}`);
    console.log(`  Has PLATFORM_OWNER in array: ${user.roles?.includes('ROLE_PLATFORM_OWNER')}`);
    console.log('');
  });

  // Optionally update the first user to have platform owner
  // Uncomment to auto-grant platform owner to first user
  /*
  if (users.length > 0) {
    const firstUser = users[0];
    if (!firstUser.roles?.includes('ROLE_PLATFORM_OWNER')) {
      await prisma.user.update({
        where: { id: firstUser.id },
        data: {
          roles: ['ROLE_WEDDING_OWNER', 'ROLE_PLATFORM_OWNER'],
        },
      });
      console.log(`✅ Granted ROLE_PLATFORM_OWNER to ${firstUser.email}`);
    }
  }
  */
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
