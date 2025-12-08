import { PrismaClient } from "@prisma/client"
import "server-only";

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient
}

// Configure Prisma with connection pool settings
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Connection pool is configured via DATABASE_URL query params:
    // ?connection_limit=20&pool_timeout=30
  })
}

export let prisma: PrismaClient
if (process.env.NODE_ENV === "production") {
  prisma = prismaClientSingleton()
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = prismaClientSingleton()
  }
  prisma = global.cachedPrisma
}

// Utility function for batch processing arrays
export async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

// Health check function for monitoring
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}
