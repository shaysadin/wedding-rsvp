/**
 * Migration script to add seats to existing tables
 * Run this once to populate seats for all existing tables
 */

import { PrismaClient } from "@prisma/client";
import { calculateSeatPositions } from "../lib/seating/seat-calculator";

const prisma = new PrismaClient();

async function migrateExistingTables() {
  console.log("Starting migration of existing tables...");

  try {
    // Find all tables that don't have seats
    const tablesWithoutSeats = await prisma.weddingTable.findMany({
      where: {
        seats: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        capacity: true,
        shape: true,
        seatingArrangement: true,
      },
    });

    console.log(`Found ${tablesWithoutSeats.length} tables without seats`);

    if (tablesWithoutSeats.length === 0) {
      console.log("All tables already have seats. Nothing to migrate.");
      return;
    }

    let migratedCount = 0;

    for (const table of tablesWithoutSeats) {
      console.log(`Migrating table: ${table.name} (${table.capacity} seats)`);

      // Calculate seat positions
      const seatPositions = calculateSeatPositions(
        table.capacity,
        (table.shape as any) || "circle",
        (table.seatingArrangement as any) || "even"
      );

      // Create seats for this table
      await prisma.tableSeat.createMany({
        data: seatPositions.map((seat) => ({
          tableId: table.id,
          seatNumber: seat.seatNumber,
          relativeX: seat.relativeX,
          relativeY: seat.relativeY,
          angle: seat.angle,
        })),
      });

      migratedCount++;
      console.log(`✓ Created ${seatPositions.length} seats for ${table.name}`);
    }

    console.log(`\n✅ Migration complete! Migrated ${migratedCount} tables.`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateExistingTables()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
