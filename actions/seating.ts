"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  createTableSchema,
  updateTableSchema,
  updateTablePositionSchema,
  updateTableSizeSchema,
  updateTableRotationSchema,
  assignGuestsSchema,
  removeGuestSchema,
  moveGuestSchema,
  createVenueBlockSchema,
  updateVenueBlockSchema,
  updateVenueBlockPositionSchema,
  updateVenueBlockSizeSchema,
  updateVenueBlockRotationSchema,
  autoArrangeSchema,
  markGuestArrivedSchema,
  updateGuestTableSchema,
  type CreateTableInput,
  type UpdateTableInput,
  type UpdateTablePositionInput,
  type UpdateTableSizeInput,
  type UpdateTableRotationInput,
  type AssignGuestsInput,
  type RemoveGuestInput,
  type MoveGuestInput,
  type CreateVenueBlockInput,
  type UpdateVenueBlockInput,
  type UpdateVenueBlockPositionInput,
  type UpdateVenueBlockSizeInput,
  type UpdateVenueBlockRotationInput,
  type AutoArrangeInput,
  type MarkGuestArrivedInput,
  type UpdateGuestTableInput,
} from "@/lib/validations/seating";

// ============ HELPER FUNCTIONS ============

/**
 * Calculate seats used by a guest based on their RSVP status
 * - ACCEPTED: use their confirmed guestCount
 * - PENDING: use expectedGuests as estimate
 * - DECLINED: 0 seats
 */
function getSeatsUsed(guest: {
  expectedGuests: number;
  rsvp?: { status: string; guestCount: number } | null;
}): number {
  if (guest.rsvp?.status === "DECLINED") return 0;
  if (guest.rsvp?.status === "ACCEPTED") return guest.rsvp.guestCount || 1;
  return guest.expectedGuests || 1;
}

// ============ TABLE CRUD ============

export async function createTable(input: CreateTableInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = createTableSchema.parse(input);

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: validatedData.weddingEventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const table = await prisma.weddingTable.create({
      data: {
        weddingEventId: validatedData.weddingEventId,
        name: validatedData.name,
        capacity: validatedData.capacity,
        shape: validatedData.shape,
      },
    });

    revalidatePath(`/dashboard/events/${validatedData.weddingEventId}/seating`);

    return { success: true, table };
  } catch (error) {
    console.error("Error creating table:", error);
    return { error: "Failed to create table" };
  }
}

export async function updateTable(input: UpdateTableInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateTableSchema.parse(input);
    const { id, ...updateData } = validatedData;

    // Verify ownership through event
    const existingTable = await prisma.weddingTable.findFirst({
      where: { id },
      include: { weddingEvent: true },
    });

    if (!existingTable || existingTable.weddingEvent.ownerId !== user.id) {
      return { error: "Table not found" };
    }

    const table = await prisma.weddingTable.update({
      where: { id },
      data: updateData,
    });

    revalidatePath(`/dashboard/events/${existingTable.weddingEventId}/seating`);

    return { success: true, table };
  } catch (error) {
    console.error("Error updating table:", error);
    return { error: "Failed to update table" };
  }
}

export async function updateTablePosition(input: UpdateTablePositionInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateTablePositionSchema.parse(input);

    // Verify ownership through event
    const existingTable = await prisma.weddingTable.findFirst({
      where: { id: validatedData.id },
      include: { weddingEvent: true },
    });

    if (!existingTable || existingTable.weddingEvent.ownerId !== user.id) {
      return { error: "Table not found" };
    }

    const table = await prisma.weddingTable.update({
      where: { id: validatedData.id },
      data: {
        positionX: validatedData.positionX,
        positionY: validatedData.positionY,
      },
    });

    revalidatePath(`/dashboard/events/${existingTable.weddingEventId}/seating`);

    return { success: true, table };
  } catch (error) {
    console.error("Error updating table position:", error);
    return { error: "Failed to update table position" };
  }
}

export async function updateTableSize(input: UpdateTableSizeInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateTableSizeSchema.parse(input);

    // Verify ownership through event
    const existingTable = await prisma.weddingTable.findFirst({
      where: { id: validatedData.id },
      include: { weddingEvent: true },
    });

    if (!existingTable || existingTable.weddingEvent.ownerId !== user.id) {
      return { error: "Table not found" };
    }

    const table = await prisma.weddingTable.update({
      where: { id: validatedData.id },
      data: {
        width: validatedData.width,
        height: validatedData.height,
      },
    });

    revalidatePath(`/dashboard/events/${existingTable.weddingEventId}/seating`);

    return { success: true, table };
  } catch (error) {
    console.error("Error updating table size:", error);
    return { error: "Failed to update table size" };
  }
}

export async function updateTableRotation(input: UpdateTableRotationInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateTableRotationSchema.parse(input);

    // Verify ownership through event
    const existingTable = await prisma.weddingTable.findFirst({
      where: { id: validatedData.id },
      include: { weddingEvent: true },
    });

    if (!existingTable || existingTable.weddingEvent.ownerId !== user.id) {
      return { error: "Table not found" };
    }

    const table = await prisma.weddingTable.update({
      where: { id: validatedData.id },
      data: {
        rotation: validatedData.rotation,
      },
    });

    revalidatePath(`/dashboard/events/${existingTable.weddingEventId}/seating`);

    return { success: true, table };
  } catch (error) {
    console.error("Error updating table rotation:", error);
    return { error: "Failed to update table rotation" };
  }
}

export async function deleteTable(tableId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through event
    const existingTable = await prisma.weddingTable.findFirst({
      where: { id: tableId },
      include: { weddingEvent: true },
    });

    if (!existingTable || existingTable.weddingEvent.ownerId !== user.id) {
      return { error: "Table not found" };
    }

    await prisma.weddingTable.delete({
      where: { id: tableId },
    });

    revalidatePath(`/dashboard/events/${existingTable.weddingEventId}/seating`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting table:", error);
    return { error: "Failed to delete table" };
  }
}

// ============ TABLE QUERIES ============

export async function getEventTables(eventId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const tables = await prisma.weddingTable.findMany({
      where: { weddingEventId: eventId },
      include: {
        assignments: {
          include: {
            guest: {
              include: {
                rsvp: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate seats used for each table
    const tablesWithSeats = tables.map((table) => {
      const seatsUsed = table.assignments.reduce(
        (sum, assignment) => sum + getSeatsUsed(assignment.guest),
        0
      );
      return {
        ...table,
        seatsUsed,
        seatsAvailable: table.capacity - seatsUsed,
      };
    });

    return { success: true, tables: tablesWithSeats };
  } catch (error) {
    console.error("Error fetching tables:", error);
    return { error: "Failed to fetch tables" };
  }
}

// ============ GUEST ASSIGNMENT ============

export async function assignGuestsToTable(input: AssignGuestsInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = assignGuestsSchema.parse(input);

    // Verify table ownership
    const table = await prisma.weddingTable.findFirst({
      where: { id: validatedData.tableId },
      include: {
        weddingEvent: true,
        assignments: {
          include: {
            guest: {
              include: { rsvp: true },
            },
          },
        },
      },
    });

    if (!table || table.weddingEvent.ownerId !== user.id) {
      return { error: "Table not found" };
    }

    // Verify all guests belong to the same event
    const guests = await prisma.guest.findMany({
      where: {
        id: { in: validatedData.guestIds },
        weddingEventId: table.weddingEventId,
      },
      include: { rsvp: true },
    });

    if (guests.length !== validatedData.guestIds.length) {
      return { error: "Some guests not found or don't belong to this event" };
    }

    // Calculate current seats used
    const currentSeatsUsed = table.assignments.reduce(
      (sum, assignment) => sum + getSeatsUsed(assignment.guest),
      0
    );

    // Calculate new seats needed
    const newSeatsNeeded = guests.reduce(
      (sum, guest) => sum + getSeatsUsed(guest),
      0
    );

    // Check capacity (warning only, don't block)
    const wouldExceed = currentSeatsUsed + newSeatsNeeded > table.capacity;

    // Remove any existing assignments for these guests (move to new table)
    await prisma.tableAssignment.deleteMany({
      where: { guestId: { in: validatedData.guestIds } },
    });

    // Create new assignments
    await prisma.tableAssignment.createMany({
      data: validatedData.guestIds.map((guestId) => ({
        tableId: validatedData.tableId,
        guestId,
      })),
    });

    revalidatePath(`/dashboard/events/${table.weddingEventId}/seating`);

    return {
      success: true,
      assigned: guests.length,
      capacityWarning: wouldExceed,
    };
  } catch (error) {
    console.error("Error assigning guests:", error);
    return { error: "Failed to assign guests" };
  }
}

export async function removeGuestFromTable(input: RemoveGuestInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = removeGuestSchema.parse(input);

    // Delete with ownership check in single query using nested where
    const result = await prisma.tableAssignment.deleteMany({
      where: {
        guestId: validatedData.guestId,
        table: {
          weddingEvent: {
            ownerId: user.id,
          },
        },
      },
    });

    if (result.count === 0) {
      return { error: "Assignment not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing guest from table:", error);
    return { error: "Failed to remove guest from table" };
  }
}

export async function removeGuestsFromTableBulk(guestIds: string[]) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    if (!guestIds.length) {
      return { error: "No guests provided" };
    }

    // Delete all in single query with ownership check built into the where clause
    const result = await prisma.tableAssignment.deleteMany({
      where: {
        guestId: { in: guestIds },
        table: {
          weddingEvent: {
            ownerId: user.id,
          },
        },
      },
    });

    return { success: true, removed: result.count };
  } catch (error) {
    console.error("Error removing guests from table:", error);
    return { error: "Failed to remove guests from table" };
  }
}

export async function moveGuestToTable(input: MoveGuestInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = moveGuestSchema.parse(input);

    // Verify the new table exists and belongs to user
    const newTable = await prisma.weddingTable.findFirst({
      where: { id: validatedData.newTableId },
      include: { weddingEvent: true },
    });

    if (!newTable || newTable.weddingEvent.ownerId !== user.id) {
      return { error: "Target table not found" };
    }

    // Verify the guest exists and belongs to the same event
    const guest = await prisma.guest.findFirst({
      where: {
        id: validatedData.guestId,
        weddingEventId: newTable.weddingEventId,
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    // Remove existing assignment if any
    await prisma.tableAssignment.deleteMany({
      where: { guestId: validatedData.guestId },
    });

    // Create new assignment
    await prisma.tableAssignment.create({
      data: {
        tableId: validatedData.newTableId,
        guestId: validatedData.guestId,
      },
    });

    revalidatePath(`/dashboard/events/${newTable.weddingEventId}/seating`);

    return { success: true };
  } catch (error) {
    console.error("Error moving guest:", error);
    return { error: "Failed to move guest" };
  }
}

// ============ GUEST QUERIES ============

export async function getUnseatedGuests(eventId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const guests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        tableAssignment: null, // No table assignment
      },
      include: {
        rsvp: true,
      },
      orderBy: { name: "asc" },
    });

    // Add seats calculation
    const guestsWithSeats = guests.map((guest) => ({
      ...guest,
      seatsNeeded: getSeatsUsed(guest),
    }));

    return { success: true, guests: guestsWithSeats };
  } catch (error) {
    console.error("Error fetching unseated guests:", error);
    return { error: "Failed to fetch unseated guests" };
  }
}

export async function getSeatingStats(eventId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership and get stats in a single optimized query
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
      select: {
        id: true,
        tables: {
          select: {
            capacity: true,
            assignments: {
              select: {
                guest: {
                  select: {
                    expectedGuests: true,
                    rsvp: {
                      select: {
                        status: true,
                        guestCount: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        guests: {
          select: {
            id: true,
            expectedGuests: true,
            tableAssignment: { select: { id: true } },
            rsvp: {
              select: {
                status: true,
                guestCount: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Calculate stats from single query result
    const totalTables = event.tables.length;
    const totalCapacity = event.tables.reduce((sum, t) => sum + t.capacity, 0);

    // Separate seated and unseated guests
    const seatedGuests = event.guests.filter((g) => g.tableAssignment);
    const unseatedGuests = event.guests.filter((g) => !g.tableAssignment);

    const seatedByPartySize = seatedGuests.reduce(
      (sum, g) => sum + getSeatsUsed(g),
      0
    );
    const unseatedByPartySize = unseatedGuests.reduce(
      (sum, g) => sum + getSeatsUsed(g),
      0
    );

    return {
      success: true,
      stats: {
        totalTables,
        totalCapacity,
        seatedGuestsCount: seatedGuests.length,
        unseatedGuestsCount: unseatedGuests.length,
        seatedByPartySize,
        unseatedByPartySize,
        capacityUsed: seatedByPartySize,
        capacityRemaining: totalCapacity - seatedByPartySize,
      },
    };
  } catch (error) {
    console.error("Error fetching seating stats:", error);
    return { error: "Failed to fetch seating stats" };
  }
}

// ============ FILTERED GUESTS FOR ASSIGNMENT ============

export async function getGuestsForAssignment(
  eventId: string,
  filters?: {
    seated?: "all" | "seated" | "unseated";
    side?: string;
    groupName?: string;
    rsvpStatus?: "PENDING" | "ACCEPTED" | "DECLINED";
    search?: string;
  }
) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Build where clause
    const where: Record<string, unknown> = {
      weddingEventId: eventId,
    };

    if (filters?.seated === "seated") {
      where.tableAssignment = { isNot: null };
    } else if (filters?.seated === "unseated") {
      where.tableAssignment = null;
    }

    if (filters?.side) {
      where.side = filters.side;
    }

    if (filters?.groupName) {
      where.groupName = filters.groupName;
    }

    if (filters?.search) {
      where.name = { contains: filters.search, mode: "insensitive" };
    }

    const guests = await prisma.guest.findMany({
      where,
      include: {
        rsvp: true,
        tableAssignment: {
          include: {
            table: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Filter by RSVP status (needs post-query filter since it's a relation)
    let filteredGuests = guests;
    if (filters?.rsvpStatus) {
      filteredGuests = guests.filter(
        (g) => g.rsvp?.status === filters.rsvpStatus
      );
    }

    // Add seats calculation
    const guestsWithSeats = filteredGuests.map((guest) => ({
      ...guest,
      seatsNeeded: getSeatsUsed(guest),
    }));

    return { success: true, guests: guestsWithSeats };
  } catch (error) {
    console.error("Error fetching guests for assignment:", error);
    return { error: "Failed to fetch guests" };
  }
}

// ============ VENUE BLOCK CRUD ============

export async function createVenueBlock(input: CreateVenueBlockInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = createVenueBlockSchema.parse(input);

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: validatedData.weddingEventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const block = await prisma.venueBlock.create({
      data: {
        weddingEventId: validatedData.weddingEventId,
        name: validatedData.name,
        type: validatedData.type,
        shape: validatedData.shape,
      },
    });

    revalidatePath(`/dashboard/events/${validatedData.weddingEventId}/seating`);

    return { success: true, block };
  } catch (error) {
    console.error("Error creating venue block:", error);
    return { error: "Failed to create venue block" };
  }
}

export async function updateVenueBlock(input: UpdateVenueBlockInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateVenueBlockSchema.parse(input);
    const { id, ...updateData } = validatedData;

    // Verify ownership through event
    const existingBlock = await prisma.venueBlock.findFirst({
      where: { id },
      include: { weddingEvent: true },
    });

    if (!existingBlock || existingBlock.weddingEvent.ownerId !== user.id) {
      return { error: "Block not found" };
    }

    const block = await prisma.venueBlock.update({
      where: { id },
      data: updateData,
    });

    revalidatePath(`/dashboard/events/${existingBlock.weddingEventId}/seating`);

    return { success: true, block };
  } catch (error) {
    console.error("Error updating venue block:", error);
    return { error: "Failed to update venue block" };
  }
}

export async function updateVenueBlockPosition(input: UpdateVenueBlockPositionInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateVenueBlockPositionSchema.parse(input);

    // Verify ownership through event
    const existingBlock = await prisma.venueBlock.findFirst({
      where: { id: validatedData.id },
      include: { weddingEvent: true },
    });

    if (!existingBlock || existingBlock.weddingEvent.ownerId !== user.id) {
      return { error: "Block not found" };
    }

    const block = await prisma.venueBlock.update({
      where: { id: validatedData.id },
      data: {
        positionX: validatedData.positionX,
        positionY: validatedData.positionY,
      },
    });

    revalidatePath(`/dashboard/events/${existingBlock.weddingEventId}/seating`);

    return { success: true, block };
  } catch (error) {
    console.error("Error updating venue block position:", error);
    return { error: "Failed to update venue block position" };
  }
}

export async function updateVenueBlockSize(input: UpdateVenueBlockSizeInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateVenueBlockSizeSchema.parse(input);

    // Verify ownership through event
    const existingBlock = await prisma.venueBlock.findFirst({
      where: { id: validatedData.id },
      include: { weddingEvent: true },
    });

    if (!existingBlock || existingBlock.weddingEvent.ownerId !== user.id) {
      return { error: "Block not found" };
    }

    const block = await prisma.venueBlock.update({
      where: { id: validatedData.id },
      data: {
        width: validatedData.width,
        height: validatedData.height,
      },
    });

    revalidatePath(`/dashboard/events/${existingBlock.weddingEventId}/seating`);

    return { success: true, block };
  } catch (error) {
    console.error("Error updating venue block size:", error);
    return { error: "Failed to update venue block size" };
  }
}

export async function updateVenueBlockRotation(input: UpdateVenueBlockRotationInput) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = updateVenueBlockRotationSchema.parse(input);

    // Verify ownership through event
    const existingBlock = await prisma.venueBlock.findFirst({
      where: { id: validatedData.id },
      include: { weddingEvent: true },
    });

    if (!existingBlock || existingBlock.weddingEvent.ownerId !== user.id) {
      return { error: "Block not found" };
    }

    const block = await prisma.venueBlock.update({
      where: { id: validatedData.id },
      data: {
        rotation: validatedData.rotation,
      },
    });

    revalidatePath(`/dashboard/events/${existingBlock.weddingEventId}/seating`);

    return { success: true, block };
  } catch (error) {
    console.error("Error updating venue block rotation:", error);
    return { error: "Failed to update venue block rotation" };
  }
}

export async function deleteVenueBlock(blockId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify ownership through event
    const existingBlock = await prisma.venueBlock.findFirst({
      where: { id: blockId },
      include: { weddingEvent: true },
    });

    if (!existingBlock || existingBlock.weddingEvent.ownerId !== user.id) {
      return { error: "Block not found" };
    }

    await prisma.venueBlock.delete({
      where: { id: blockId },
    });

    revalidatePath(`/dashboard/events/${existingBlock.weddingEventId}/seating`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting venue block:", error);
    return { error: "Failed to delete venue block" };
  }
}

export async function getEventVenueBlocks(eventId: string) {
  try {
    const user = await getCurrentUser();

    // Check if user has ROLE_WEDDING_OWNER in their roles array
    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    const blocks = await prisma.venueBlock.findMany({
      where: { weddingEventId: eventId },
      orderBy: { createdAt: "asc" },
    });

    return { success: true, blocks };
  } catch (error) {
    console.error("Error fetching venue blocks:", error);
    return { error: "Failed to fetch venue blocks" };
  }
}

/**
 * Get guests with table assignments for hostess view (public, no auth required)
 * Returns only accepted guests with their table assignments
 */
export async function getEventGuestsForHostess(eventId: string) {
  try {
    // Verify event exists and is active
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        dateTime: true,
        location: true,
        venue: true,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get all guests who have confirmed attendance (ACCEPTED status)
    // Include their table assignments
    const guests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        rsvp: {
          status: "ACCEPTED",
        },
      },
      select: {
        id: true,
        name: true,
        rsvp: {
          select: {
            guestCount: true,
          },
        },
        tableAssignment: {
          select: {
            table: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { tableAssignment: { table: { name: "asc" } } },
        { name: "asc" },
      ],
    });

    // Transform the data for easier consumption
    const guestsWithTables = guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      guestCount: guest.rsvp?.guestCount || 1,
      tableName: guest.tableAssignment?.table?.name || null,
      tableId: guest.tableAssignment?.table?.id || null,
    }));

    return {
      success: true,
      event,
      guests: guestsWithTables,
    };
  } catch (error) {
    console.error("Error fetching guests for hostess view:", error);
    return { error: "Failed to fetch guest list" };
  }
}

// ============ AUTO-ARRANGE FEATURE ============

/**
 * Auto-arrange guests into tables based on filters and grouping strategy
 * This will DELETE all existing tables and create new ones
 */
export async function autoArrangeTables(input: AutoArrangeInput) {
  try {
    const user = await getCurrentUser();

    const hasWeddingOwnerRole = user?.roles?.includes(UserRole.ROLE_WEDDING_OWNER);
    if (!user || !hasWeddingOwnerRole) {
      return { error: "Unauthorized" };
    }

    const validatedData = autoArrangeSchema.parse(input);

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: { id: validatedData.eventId, ownerId: user.id },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Build guest filter
    const guestWhere: Record<string, unknown> = {
      weddingEventId: validatedData.eventId,
    };

    // Filter by side
    if (validatedData.sideFilter && validatedData.sideFilter !== "all") {
      guestWhere.side = validatedData.sideFilter;
    }

    // Filter by group
    if (validatedData.groupFilter && validatedData.groupFilter !== "all") {
      guestWhere.groupName = validatedData.groupFilter;
    }

    // Get guests matching filters
    const guests = await prisma.guest.findMany({
      where: guestWhere,
      include: { rsvp: true },
    });

    // Filter by RSVP status
    const filteredGuests = guests.filter((guest) => {
      const status = guest.rsvp?.status || "PENDING";
      return validatedData.includeRsvpStatus.includes(status as "ACCEPTED" | "PENDING");
    });

    if (filteredGuests.length === 0) {
      return { error: "No guests match the selected filters" };
    }

    // Sorting has two purposes:
    // 1. TABLE ORGANIZATION: Group → Side (determines which guests sit together)
    // 2. SEATING PRIORITY: RSVP Status (Approved > Pending) - confirmed guests get priority seating
    //
    // Within each Group-Side combination, approved guests are seated first
    const sortedGuests = [...filteredGuests].sort((a, b) => {
      // 1. Sort by group name (primary - table organization)
      const groupA = (a.groupName || "zzz_other").toLowerCase();
      const groupB = (b.groupName || "zzz_other").toLowerCase();
      if (groupA !== groupB) return groupA.localeCompare(groupB);

      // 2. Sort by side (secondary - table organization)
      const sideA = (a.side || "zzz_other").toLowerCase();
      const sideB = (b.side || "zzz_other").toLowerCase();
      if (sideA !== sideB) return sideA.localeCompare(sideB);

      // 3. Sort by RSVP status (seating priority - ACCEPTED guests seated first)
      const statusA = a.rsvp?.status || "PENDING";
      const statusB = b.rsvp?.status || "PENDING";
      const statusOrder: Record<string, number> = { ACCEPTED: 0, PENDING: 1, DECLINED: 2 };
      if (statusOrder[statusA] !== statusOrder[statusB]) {
        return statusOrder[statusA] - statusOrder[statusB];
      }

      // 4. Sort by name (alphabetically)
      return a.name.localeCompare(b.name);
    });

    // Delete all existing tables for this event
    await prisma.weddingTable.deleteMany({
      where: { weddingEventId: validatedData.eventId },
    });

    // Group guests based on strategy
    // Strategy: Group → Side (guests with same group stay together, then by side)
    type GuestGroup = { key: string; guests: typeof sortedGuests };
    const groups: GuestGroup[] = [];

    if (validatedData.groupingStrategy === "side-then-group") {
      // Group by group first, then by side within each group
      // This keeps group members together while respecting sides
      const byKey = new Map<string, typeof sortedGuests>();

      for (const guest of sortedGuests) {
        const group = guest.groupName || "other";
        const side = guest.side || "other";
        const key = `${group}-${side}`;

        if (!byKey.has(key)) {
          byKey.set(key, []);
        }
        byKey.get(key)!.push(guest);
      }

      for (const [key, guestList] of byKey) {
        groups.push({ key, guests: guestList });
      }
    } else {
      // Group by group only
      const byGroup = new Map<string, typeof sortedGuests>();

      for (const guest of sortedGuests) {
        const group = guest.groupName || "other";

        if (!byGroup.has(group)) {
          byGroup.set(group, []);
        }
        byGroup.get(group)!.push(guest);
      }

      for (const [key, guestList] of byGroup) {
        groups.push({ key, guests: guestList });
      }
    }

    // Hebrew translations for sides and groups
    const hebrewSideLabels: Record<string, string> = {
      bride: "כלה",
      groom: "חתן",
      both: "שניהם",
      other: "אחר",
    };

    const hebrewGroupLabels: Record<string, string> = {
      family: "משפחה",
      friends: "חברים",
      work: "עבודה",
      other: "אחר",
    };

    // Helper to get Hebrew label for a key
    function getHebrewLabel(key: string, strategy: string): string {
      if (strategy === "side-then-group") {
        // Key format: "group-side" (e.g., "family-bride")
        const [group, side] = key.split("-");
        const groupLabel = hebrewGroupLabels[group.toLowerCase()] || group;
        const sideLabel = hebrewSideLabels[side.toLowerCase()] || side;
        return `${groupLabel} - ${sideLabel}`;
      } else {
        // Key is just the group
        return hebrewGroupLabels[key.toLowerCase()] || key;
      }
    }

    // Create tables and assign guests
    let tableNumber = 1;
    let tablesCreated = 0;
    let guestsSeated = 0;

    for (const group of groups) {
      const guestsInGroup = group.guests;
      let currentIndex = 0;
      let groupTableNumber = 1;

      while (currentIndex < guestsInGroup.length) {
        // Calculate how many guests fit in this table
        let seatsUsed = 0;
        const guestsForTable: string[] = [];

        while (currentIndex < guestsInGroup.length && seatsUsed < validatedData.tableSize) {
          const guest = guestsInGroup[currentIndex];
          const seats = getSeatsUsed(guest);

          // Allow one more guest even if slightly over capacity
          if (seatsUsed + seats <= validatedData.tableSize || guestsForTable.length === 0) {
            guestsForTable.push(guest.id);
            seatsUsed += seats;
            currentIndex++;
          } else {
            break;
          }
        }

        if (guestsForTable.length > 0) {
          // Create table with Hebrew name format: "1 - קבוצה" or "1 - צד - קבוצה"
          const hebrewLabel = getHebrewLabel(group.key, validatedData.groupingStrategy);
          const tableName = `${tableNumber} - ${hebrewLabel}`;

          const table = await prisma.weddingTable.create({
            data: {
              weddingEventId: validatedData.eventId,
              name: tableName,
              capacity: validatedData.tableSize,
              shape: validatedData.tableShape,
            },
          });

          // Assign guests to this table
          await prisma.tableAssignment.createMany({
            data: guestsForTable.map((guestId) => ({
              tableId: table.id,
              guestId,
            })),
          });

          tablesCreated++;
          guestsSeated += guestsForTable.length;
          tableNumber++;
          groupTableNumber++;
        }
      }
    }

    revalidatePath(`/dashboard/events/${validatedData.eventId}/seating`);

    return {
      success: true,
      tablesCreated,
      guestsSeated,
    };
  } catch (error) {
    console.error("Error auto-arranging tables:", error);
    return { error: "Failed to auto-arrange tables" };
  }
}

// ============ HOSTESS FEATURES ============

/**
 * Get enhanced hostess data with arrival status and table details
 * Public route - no auth required
 */
export async function getHostessData(eventId: string) {
  try {
    // Verify event exists and is active
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: eventId,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        dateTime: true,
        location: true,
        venue: true,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Get all tables with their assignments
    const tables = await prisma.weddingTable.findMany({
      where: { weddingEventId: eventId },
      include: {
        assignments: {
          include: {
            guest: {
              include: {
                rsvp: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Get all accepted guests with their table assignments and arrival status
    const guests = await prisma.guest.findMany({
      where: {
        weddingEventId: eventId,
        rsvp: {
          status: "ACCEPTED",
        },
      },
      include: {
        rsvp: true,
        tableAssignment: {
          include: {
            table: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    // Transform guests data
    const guestsWithDetails = guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      guestCount: guest.rsvp?.guestCount || 1,
      side: guest.side,
      groupName: guest.groupName,
      tableId: guest.tableAssignment?.table?.id || null,
      tableName: guest.tableAssignment?.table?.name || null,
      arrivedAt: guest.arrivedAt,
      arrivedTableId: guest.arrivedTableId,
      isArrived: !!guest.arrivedAt,
    }));

    // Transform tables data with occupancy info
    const tablesWithDetails = tables.map((table) => {
      const assignedGuests = table.assignments.map((a) => ({
        id: a.guest.id,
        name: a.guest.name,
        guestCount: a.guest.rsvp?.guestCount || 1,
        side: a.guest.side,
        groupName: a.guest.groupName,
        arrivedAt: a.guest.arrivedAt,
        isArrived: !!a.guest.arrivedAt,
      }));

      const totalSeats = table.assignments.reduce(
        (sum, a) => sum + (a.guest.rsvp?.guestCount || 1),
        0
      );

      // Count arrived guests (not just arrived count, but total arrived people)
      const arrivedCount = table.assignments.filter((a) => a.guest.arrivedAt).length;
      const arrivedPeopleCount = table.assignments
        .filter((a) => a.guest.arrivedAt)
        .reduce((sum, a) => sum + (a.guest.rsvp?.guestCount || 1), 0);

      return {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        seatsUsed: totalSeats,
        seatsAvailable: table.capacity - totalSeats,
        guestCount: table.assignments.length,
        arrivedCount,
        arrivedPeopleCount,
        guests: assignedGuests,
        isFull: totalSeats >= table.capacity,
      };
    });

    // Calculate summary stats
    const totalGuests = guests.length;
    const arrivedGuests = guests.filter((g) => g.arrivedAt).length;
    const totalExpected = guests.reduce((sum, g) => sum + (g.rsvp?.guestCount || 1), 0);

    return {
      success: true,
      event,
      guests: guestsWithDetails,
      tables: tablesWithDetails,
      stats: {
        totalGuests,
        arrivedGuests,
        totalExpected,
        tablesCount: tables.length,
      },
    };
  } catch (error) {
    console.error("Error fetching hostess data:", error);
    return { error: "Failed to fetch hostess data" };
  }
}

/**
 * Mark a guest as arrived (public route for hostess)
 * Auto-assigns to their original table if tableId not provided
 */
export async function markGuestArrived(input: MarkGuestArrivedInput) {
  try {
    const validatedData = markGuestArrivedSchema.parse(input);

    // Get the guest with their table assignment
    const guest = await prisma.guest.findFirst({
      where: { id: validatedData.guestId },
      include: {
        tableAssignment: true,
        weddingEvent: true,
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    // Check if event is active
    if (!guest.weddingEvent.isActive) {
      return { error: "Event is not active" };
    }

    // Determine which table to mark as arrived at
    const tableId = validatedData.tableId || guest.tableAssignment?.tableId || null;

    // Update guest with arrival info
    await prisma.guest.update({
      where: { id: validatedData.guestId },
      data: {
        arrivedAt: new Date(),
        arrivedTableId: tableId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking guest as arrived:", error);
    return { error: "Failed to mark guest as arrived" };
  }
}

/**
 * Unmark a guest as arrived (public route for hostess)
 */
export async function unmarkGuestArrived(guestId: string) {
  try {
    // Get the guest
    const guest = await prisma.guest.findFirst({
      where: { id: guestId },
      include: { weddingEvent: true },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    // Check if event is active
    if (!guest.weddingEvent.isActive) {
      return { error: "Event is not active" };
    }

    // Clear arrival info
    await prisma.guest.update({
      where: { id: guestId },
      data: {
        arrivedAt: null,
        arrivedTableId: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error unmarking guest as arrived:", error);
    return { error: "Failed to unmark guest as arrived" };
  }
}

/**
 * Update guest's table assignment from hostess view (public route)
 * This allows real-time table changes during the event
 */
export async function updateGuestTableForHostess(input: UpdateGuestTableInput) {
  try {
    const validatedData = updateGuestTableSchema.parse(input);

    // Get the guest with their current assignment
    const guest = await prisma.guest.findFirst({
      where: { id: validatedData.guestId },
      include: {
        weddingEvent: true,
        tableAssignment: true,
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    // Check if event is active
    if (!guest.weddingEvent.isActive) {
      return { error: "Event is not active" };
    }

    // Verify the new table exists and belongs to the same event
    const newTable = await prisma.weddingTable.findFirst({
      where: {
        id: validatedData.tableId,
        weddingEventId: guest.weddingEventId,
      },
    });

    if (!newTable) {
      return { error: "Table not found" };
    }

    // Remove existing assignment if any
    if (guest.tableAssignment) {
      await prisma.tableAssignment.delete({
        where: { id: guest.tableAssignment.id },
      });
    }

    // Create new assignment
    await prisma.tableAssignment.create({
      data: {
        tableId: validatedData.tableId,
        guestId: validatedData.guestId,
      },
    });

    // If guest has already arrived, update the arrivedTableId too
    if (guest.arrivedAt) {
      await prisma.guest.update({
        where: { id: validatedData.guestId },
        data: { arrivedTableId: validatedData.tableId },
      });
    }

    return { success: true, tableName: newTable.name };
  } catch (error) {
    console.error("Error updating guest table:", error);
    return { error: "Failed to update guest table" };
  }
}
