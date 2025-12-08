"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  createTableSchema,
  updateTableSchema,
  updateTablePositionSchema,
  assignGuestsSchema,
  removeGuestSchema,
  moveGuestSchema,
  type CreateTableInput,
  type UpdateTableInput,
  type UpdateTablePositionInput,
  type AssignGuestsInput,
  type RemoveGuestInput,
  type MoveGuestInput,
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

export async function deleteTable(tableId: string) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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

    if (!user || user.role !== UserRole.ROLE_WEDDING_OWNER) {
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
