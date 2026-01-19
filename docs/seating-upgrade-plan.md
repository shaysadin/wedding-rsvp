# Seating Floor Planning System Upgrade Plan

**Created:** January 2026
**Status:** Planning Phase
**Priority:** High (UX Enhancement)

---

## Executive Summary

This plan outlines a comprehensive upgrade to the seating floor planning system, transforming it from a grid-based layout tool into a professional, visual floor planning canvas with individual seat management, color coding, and an intuitive drag-and-drop interface.

### Key Improvements
1. **Compact Stats Display** - Reduce stats card footprint by 60%
2. **True Canvas Experience** - Free-form drag and drop with smooth scaling
3. **Visual Seat Representation** - Show individual seats around tables
4. **Seat-Level Guest Assignment** - Assign guests to specific seats
5. **Enhanced Visual Design** - Color-coded tables with professional styling
6. **Responsive Fullscreen** - Auto-fit to screen dimensions

---

## Phase 1: Compact Stats & UI Refinement

### 1.1 Minimize Stats Cards

**Current State:**
```tsx
// 4 large cards in grid layout
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  <Card> {/* Large card with icon, title, value, subtitle */} </Card>
</div>
```

**Target State:**
- Single row compact stats bar
- Inline icons with values
- Reduce vertical space from ~120px to ~60px

**Implementation:**

**File:** `components/seating/seating-stats-compact.tsx` (NEW)

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface SeatingStatsCompactProps {
  stats: {
    totalTables: number;
    totalCapacity: number;
    seatedGuestsCount: number;
    unseatedGuestsCount: number;
    seatedByPartySize: number;
    unseatedByPartySize: number;
    capacityUsed: number;
    capacityRemaining: number;
  };
}

export function SeatingStatsCompact({ stats }: SeatingStatsCompactProps) {
  const t = useTranslations("seating");

  const items = [
    {
      label: t("stats.totalTables"),
      value: stats.totalTables,
      icon: Icons.layoutGrid,
      color: "text-primary",
    },
    {
      label: t("stats.totalSeats"),
      value: `${stats.capacityUsed}/${stats.totalCapacity}`,
      icon: Icons.users,
      color: "text-blue-500",
    },
    {
      label: t("stats.seatedGuests"),
      value: `${stats.seatedGuestsCount} (${stats.seatedByPartySize})`,
      icon: Icons.check,
      color: "text-green-500",
    },
    {
      label: t("stats.unseatedGuests"),
      value: `${stats.unseatedGuestsCount} (${stats.unseatedByPartySize})`,
      icon: Icons.alertTriangle,
      color: stats.unseatedGuestsCount > 0 ? "text-amber-500" : "text-green-500",
    },
  ];

  // Calculate capacity percentage for progress bar
  const capacityPercentage = stats.totalCapacity > 0
    ? Math.round((stats.capacityUsed / stats.totalCapacity) * 100)
    : 0;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        {/* Stats Items */}
        <div className="flex items-center gap-6 flex-wrap">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <item.icon className={cn("h-4 w-4", item.color)} />
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold">{item.value}</span>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Capacity Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">
              {t("stats.capacityUsed")}
            </div>
            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  capacityPercentage > 90 ? "bg-amber-500" : "bg-green-500"
                )}
                style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium">{capacityPercentage}%</span>
        </div>
      </div>
    </Card>
  );
}
```

**Update:** `components/seating/seating-page-content.tsx`
```typescript
// Line 17: Add import
import { SeatingStatsCompact } from "@/components/seating/seating-stats-compact";

// Line 239: Replace
- {stats && <SeatingStats stats={stats} />}
+ {stats && <SeatingStatsCompact stats={stats} />}
```

---

## Phase 2: Database Schema for Seat Management

### 2.1 Add Seat Positions to Schema

**Current Schema:**
```prisma
model WeddingTable {
  id             String            @id @default(cuid())
  name           String
  capacity       Int               @default(10)
  positionX      Int?
  positionY      Int?
  shape          String?           @default("circle")
  width          Int               @default(100)
  height         Int               @default(100)
  rotation       Int               @default(0)
  assignments    TableAssignment[]
}

model TableAssignment {
  id        String       @id @default(cuid())
  tableId   String
  guestId   String       @unique
  // No seat position!
}
```

**Enhanced Schema:**

**File:** `prisma/schema.prisma` (additions)

```prisma
model WeddingTable {
  id                  String            @id @default(cuid())
  weddingEventId      String            @map("wedding_event_id")
  name                String
  capacity            Int               @default(10)
  positionX           Int?              @map("position_x")
  positionY           Int?              @map("position_y")
  shape               String?           @default("circle")
  width               Int               @default(100)
  height              Int               @default(100)
  rotation            Int               @default(0)

  // NEW FIELDS for seat arrangement
  seatingArrangement  String?           @default("even") @map("seating_arrangement") // "even", "bride-side", "sides-only", "custom"
  colorTheme          String?           @default("default") @map("color_theme") // "default", "blue", "green", "purple", "pink"

  assignments         TableAssignment[]
  seats               TableSeat[]       // NEW RELATION
  weddingEvent        WeddingEvent      @relation(fields: [weddingEventId], references: [id], onDelete: Cascade)
  createdAt           DateTime          @default(now()) @map("created_at")
  updatedAt           DateTime          @default(now()) @updatedAt @map("updated_at")

  @@index([weddingEventId])
  @@map("wedding_tables")
}

// NEW MODEL: Individual seats around a table
model TableSeat {
  id              String           @id @default(cuid())
  tableId         String           @map("table_id")
  seatNumber      Int              @map("seat_number") // 1, 2, 3, etc.

  // Position relative to table center (for visual rendering)
  relativeX       Float            @default(0) @map("relative_x") // -1 to 1
  relativeY       Float            @default(0) @map("relative_y") // -1 to 1
  angle           Float            @default(0) // Angle in degrees for rotation

  // Assignment
  guestId         String?          @unique @map("guest_id")
  guest           Guest?           @relation(fields: [guestId], references: [id], onDelete: SetNull)

  table           WeddingTable     @relation(fields: [tableId], references: [id], onDelete: Cascade)
  createdAt       DateTime         @default(now()) @map("created_at")

  @@unique([tableId, seatNumber])
  @@index([tableId])
  @@index([guestId])
  @@map("table_seats")
}

// UPDATE: Guest model to include seat relation
model Guest {
  // ... existing fields ...
  tableAssignment   TableAssignment?
  seatAssignment    TableSeat?       // NEW RELATION
  // ... rest of model
}

// UPDATE: Remove unique constraint from TableAssignment.guestId
// since guests will be assigned via TableSeat instead
model TableAssignment {
  id        String       @id @default(cuid())
  tableId   String       @map("table_id")
  guestId   String       @map("guest_id") // Remove @unique
  createdAt DateTime     @default(now()) @map("created_at")
  guest     Guest        @relation(fields: [guestId], references: [id], onDelete: Cascade)
  table     WeddingTable @relation(fields: [tableId], references: [id], onDelete: Cascade)

  @@unique([tableId, guestId])
  @@index([tableId])
  @@index([guestId])
  @@map("table_assignments")
}
```

**Migration Note:**
- Existing `TableAssignment` records will be migrated to `TableSeat` assignments
- Need migration script to create seats for existing tables

### 2.2 Seating Arrangement Patterns

**Arrangement Types:**

1. **Even Distribution** (`even`) - Default
   - Seats evenly spaced around perimeter
   - Works for all shapes

2. **Bride/Groom Sides** (`bride-side`)
   - Clear division down the middle
   - Left side = Bride's side
   - Right side = Groom's side
   - Good for rectangle/oval shapes

3. **Sides Only** (`sides-only`)
   - No seats at head/foot of table
   - Only on long sides
   - Good for long rectangular tables

4. **Custom** (`custom`)
   - User-defined seat positions
   - Drag individual seats to reposition

**Seat Position Calculator:**

**File:** `lib/seating/seat-calculator.ts` (NEW)

```typescript
/**
 * Calculate seat positions around a table based on shape and arrangement
 */

export type SeatingArrangement = "even" | "bride-side" | "sides-only" | "custom";
export type TableShape = "circle" | "rectangle" | "rectangleRounded" | "concave" | "concaveRounded";

export interface SeatPosition {
  seatNumber: number;
  relativeX: number; // -1 to 1 (relative to table center)
  relativeY: number; // -1 to 1 (relative to table center)
  angle: number; // Rotation angle in degrees
  side?: "bride" | "groom" | "head" | "foot"; // For bride-side arrangement
}

/**
 * Generate seat positions based on table configuration
 */
export function calculateSeatPositions(
  capacity: number,
  shape: TableShape,
  arrangement: SeatingArrangement = "even"
): SeatPosition[] {
  switch (arrangement) {
    case "even":
      return calculateEvenDistribution(capacity, shape);
    case "bride-side":
      return calculateBrideSideDistribution(capacity, shape);
    case "sides-only":
      return calculateSidesOnlyDistribution(capacity, shape);
    case "custom":
      // Return default even distribution - user will customize
      return calculateEvenDistribution(capacity, shape);
    default:
      return calculateEvenDistribution(capacity, shape);
  }
}

/**
 * Even distribution around perimeter
 */
function calculateEvenDistribution(capacity: number, shape: TableShape): SeatPosition[] {
  const seats: SeatPosition[] = [];

  if (shape === "circle") {
    // Distribute evenly around circle
    for (let i = 0; i < capacity; i++) {
      const angle = (i / capacity) * 360;
      const radians = (angle - 90) * (Math.PI / 180); // Start at top

      seats.push({
        seatNumber: i + 1,
        relativeX: Math.cos(radians) * 0.5, // 0.5 = on the edge
        relativeY: Math.sin(radians) * 0.5,
        angle: angle,
      });
    }
  } else if (shape.includes("rectangle")) {
    // Distribute around rectangle perimeter
    const longSide = Math.ceil(capacity / 2);
    const shortSide = Math.floor(capacity / 2);

    let seatNum = 1;

    // Top side
    for (let i = 0; i < longSide; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.4 + (i / (longSide - 1 || 1)) * 0.8,
        relativeY: -0.5,
        angle: 180,
      });
    }

    // Bottom side
    for (let i = 0; i < shortSide; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.4 - (i / (shortSide - 1 || 1)) * 0.8,
        relativeY: 0.5,
        angle: 0,
      });
    }
  } else if (shape.includes("concave")) {
    // Distribute along the concave arc (half-circle)
    for (let i = 0; i < capacity; i++) {
      const angle = 180 + (i / (capacity - 1 || 1)) * 180; // 180 to 360 degrees
      const radians = (angle - 90) * (Math.PI / 180);

      seats.push({
        seatNumber: i + 1,
        relativeX: Math.cos(radians) * 0.45,
        relativeY: Math.sin(radians) * 0.45,
        angle: angle,
      });
    }
  }

  return seats;
}

/**
 * Bride/Groom side distribution
 */
function calculateBrideSideDistribution(capacity: number, shape: TableShape): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const halfCapacity = Math.ceil(capacity / 2);

  if (shape.includes("rectangle")) {
    let seatNum = 1;

    // Bride's side (left)
    for (let i = 0; i < halfCapacity; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.5,
        relativeY: -0.4 + (i / (halfCapacity - 1 || 1)) * 0.8,
        angle: 90,
        side: "bride",
      });
    }

    // Groom's side (right)
    for (let i = 0; i < capacity - halfCapacity; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.5,
        relativeY: -0.4 + (i / (capacity - halfCapacity - 1 || 1)) * 0.8,
        angle: 270,
        side: "groom",
      });
    }
  } else {
    // Fall back to even distribution for non-rectangular shapes
    return calculateEvenDistribution(capacity, shape);
  }

  return seats;
}

/**
 * Sides only distribution (no head/foot seats)
 */
function calculateSidesOnlyDistribution(capacity: number, shape: TableShape): SeatPosition[] {
  const seats: SeatPosition[] = [];
  const halfCapacity = Math.ceil(capacity / 2);

  if (shape.includes("rectangle")) {
    let seatNum = 1;

    // Left side
    for (let i = 0; i < halfCapacity; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: -0.5,
        relativeY: -0.35 + (i / (halfCapacity - 1 || 1)) * 0.7,
        angle: 90,
      });
    }

    // Right side
    for (let i = 0; i < capacity - halfCapacity; i++) {
      seats.push({
        seatNumber: seatNum++,
        relativeX: 0.5,
        relativeY: -0.35 + (i / (capacity - halfCapacity - 1 || 1)) * 0.7,
        angle: 270,
      });
    }
  } else {
    // Fall back to even distribution
    return calculateEvenDistribution(capacity, shape);
  }

  return seats;
}

/**
 * Convert relative position to absolute canvas position
 */
export function seatRelativeToAbsolute(
  relativeX: number,
  relativeY: number,
  tableX: number,
  tableY: number,
  tableWidth: number,
  tableHeight: number,
  tableRotation: number = 0
): { x: number; y: number } {
  // Apply table rotation
  const rotRad = (tableRotation * Math.PI) / 180;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);

  // Scale relative position to table dimensions
  const localX = relativeX * tableWidth;
  const localY = relativeY * tableHeight;

  // Rotate around table center
  const rotatedX = localX * cos - localY * sin;
  const rotatedY = localX * sin + localY * cos;

  // Translate to canvas coordinates
  return {
    x: tableX + tableWidth / 2 + rotatedX,
    y: tableY + tableHeight / 2 + rotatedY,
  };
}
```

---

## Phase 3: Enhanced Table Visual Component

### 3.1 Table with Visual Seats

**File:** `components/seating/table-with-seats.tsx` (NEW)

```typescript
"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icons } from "@/components/shared/icons";
import { seatRelativeToAbsolute } from "@/lib/seating/seat-calculator";

export type TableColorTheme = "default" | "blue" | "green" | "purple" | "pink" | "amber" | "rose";

interface TableSeat {
  id: string;
  seatNumber: number;
  relativeX: number;
  relativeY: number;
  angle: number;
  guest?: {
    id: string;
    name: string;
    rsvpStatus?: "APPROVED" | "PENDING" | "DECLINED";
  } | null;
}

interface TableWithSeatsProps {
  table: {
    id: string;
    name: string;
    capacity: number;
    shape: string;
    colorTheme?: TableColorTheme;
    width: number;
    height: number;
    rotation: number;
  };
  seats: TableSeat[];
  positionX: number;
  positionY: number;
  onSeatClick?: (seatId: string, seatNumber: number) => void;
  onTableClick?: () => void;
  isSelected?: boolean;
}

// Color theme configurations
const COLOR_THEMES: Record<TableColorTheme, {
  table: string;
  tableBorder: string;
  seat: string;
  seatOccupied: string;
  seatApproved: string;
  seatPending: string;
  seatDeclined: string;
}> = {
  default: {
    table: "bg-card",
    tableBorder: "border-primary/50",
    seat: "bg-muted border-muted-foreground/30",
    seatOccupied: "bg-blue-100 dark:bg-blue-900/30 border-blue-500",
    seatApproved: "bg-green-100 dark:bg-green-900/30 border-green-500",
    seatPending: "bg-amber-100 dark:bg-amber-900/30 border-amber-500",
    seatDeclined: "bg-red-100 dark:bg-red-900/30 border-red-500",
  },
  blue: {
    table: "bg-blue-50 dark:bg-blue-950/30",
    tableBorder: "border-blue-400",
    seat: "bg-blue-100 dark:bg-blue-900 border-blue-300",
    seatOccupied: "bg-blue-200 dark:bg-blue-800 border-blue-600",
    seatApproved: "bg-green-100 dark:bg-green-900/30 border-green-500",
    seatPending: "bg-amber-100 dark:bg-amber-900/30 border-amber-500",
    seatDeclined: "bg-red-100 dark:bg-red-900/30 border-red-500",
  },
  green: {
    table: "bg-green-50 dark:bg-green-950/30",
    tableBorder: "border-green-400",
    seat: "bg-green-100 dark:bg-green-900 border-green-300",
    seatOccupied: "bg-green-200 dark:bg-green-800 border-green-600",
    seatApproved: "bg-green-100 dark:bg-green-900/30 border-green-500",
    seatPending: "bg-amber-100 dark:bg-amber-900/30 border-amber-500",
    seatDeclined: "bg-red-100 dark:bg-red-900/30 border-red-500",
  },
  purple: {
    table: "bg-purple-50 dark:bg-purple-950/30",
    tableBorder: "border-purple-400",
    seat: "bg-purple-100 dark:bg-purple-900 border-purple-300",
    seatOccupied: "bg-purple-200 dark:bg-purple-800 border-purple-600",
    seatApproved: "bg-green-100 dark:bg-green-900/30 border-green-500",
    seatPending: "bg-amber-100 dark:bg-amber-900/30 border-amber-500",
    seatDeclined: "bg-red-100 dark:bg-red-900/30 border-red-500",
  },
  pink: {
    table: "bg-pink-50 dark:bg-pink-950/30",
    tableBorder: "border-pink-400",
    seat: "bg-pink-100 dark:bg-pink-900 border-pink-300",
    seatOccupied: "bg-pink-200 dark:bg-pink-800 border-pink-600",
    seatApproved: "bg-green-100 dark:bg-green-900/30 border-green-500",
    seatPending: "bg-amber-100 dark:bg-amber-900/30 border-amber-500",
    seatDeclined: "bg-red-100 dark:bg-red-900/30 border-red-500",
  },
  amber: {
    table: "bg-amber-50 dark:bg-amber-950/30",
    tableBorder: "border-amber-400",
    seat: "bg-amber-100 dark:bg-amber-900 border-amber-300",
    seatOccupied: "bg-amber-200 dark:bg-amber-800 border-amber-600",
    seatApproved: "bg-green-100 dark:bg-green-900/30 border-green-500",
    seatPending: "bg-amber-100 dark:bg-amber-900/30 border-amber-500",
    seatDeclined: "bg-red-100 dark:bg-red-900/30 border-red-500",
  },
  rose: {
    table: "bg-rose-50 dark:bg-rose-950/30",
    tableBorder: "border-rose-400",
    seat: "bg-rose-100 dark:bg-rose-900 border-rose-300",
    seatOccupied: "bg-rose-200 dark:bg-rose-800 border-rose-600",
    seatApproved: "bg-green-100 dark:bg-green-900/30 border-green-500",
    seatPending: "bg-amber-100 dark:bg-amber-900/30 border-amber-500",
    seatDeclined: "bg-red-100 dark:bg-red-900/30 border-red-500",
  },
};

const SEAT_SIZE = 16; // Seat circle diameter in pixels

export function TableWithSeats({
  table,
  seats,
  positionX,
  positionY,
  onSeatClick,
  onTableClick,
  isSelected,
}: TableWithSeatsProps) {
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);

  const theme = COLOR_THEMES[table.colorTheme || "default"];
  const shapeClasses: Record<string, string> = {
    circle: "rounded-full",
    rectangle: "rounded-none",
    rectangleRounded: "rounded-lg",
    concave: "rounded-t-full rounded-b-none",
    concaveRounded: "rounded-t-full rounded-b-lg",
  };

  // Calculate occupied seats
  const occupiedSeats = seats.filter(s => s.guest).length;

  return (
    <div
      className="absolute select-none"
      style={{
        left: positionX,
        top: positionY,
        width: table.width,
        height: table.height,
        transform: `rotate(${table.rotation}deg)`,
      }}
    >
      {/* Table Body */}
      <div
        className={cn(
          "relative w-full h-full border-2 shadow-md transition-all",
          "flex items-center justify-center cursor-pointer",
          theme.table,
          theme.tableBorder,
          shapeClasses[table.shape] || shapeClasses.circle,
          isSelected && "ring-2 ring-primary ring-offset-2",
          "hover:shadow-lg"
        )}
        onClick={onTableClick}
      >
        {/* Table Label */}
        <div className="text-center pointer-events-none">
          <div className="font-semibold text-sm">{table.name}</div>
          <div className="text-xs text-muted-foreground">
            {occupiedSeats}/{table.capacity}
          </div>
        </div>
      </div>

      {/* Individual Seats */}
      {seats.map((seat) => {
        const absolutePos = seatRelativeToAbsolute(
          seat.relativeX,
          seat.relativeY,
          0,
          0,
          table.width,
          table.height,
          0 // Don't rotate seats with table - they should stay upright
        );

        const seatX = absolutePos.x - SEAT_SIZE / 2;
        const seatY = absolutePos.y - SEAT_SIZE / 2;

        // Determine seat color based on guest status
        let seatColorClass = theme.seat;
        if (seat.guest) {
          if (seat.guest.rsvpStatus === "APPROVED") {
            seatColorClass = theme.seatApproved;
          } else if (seat.guest.rsvpStatus === "PENDING") {
            seatColorClass = theme.seatPending;
          } else if (seat.guest.rsvpStatus === "DECLINED") {
            seatColorClass = theme.seatDeclined;
          } else {
            seatColorClass = theme.seatOccupied;
          }
        }

        return (
          <Popover key={seat.id}>
            <PopoverTrigger asChild>
              <div
                className={cn(
                  "absolute rounded-full border-2 transition-all cursor-pointer",
                  seatColorClass,
                  hoveredSeat === seat.id && "scale-125 shadow-lg",
                  !seat.guest && "hover:scale-110"
                )}
                style={{
                  left: seatX,
                  top: seatY,
                  width: SEAT_SIZE,
                  height: SEAT_SIZE,
                  zIndex: hoveredSeat === seat.id ? 10 : 1,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeatClick?.(seat.id, seat.seatNumber);
                }}
                onMouseEnter={() => setHoveredSeat(seat.id)}
                onMouseLeave={() => setHoveredSeat(null)}
              >
                {/* Seat Number (only show if empty) */}
                {!seat.guest && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-medium">{seat.seatNumber}</span>
                  </div>
                )}
                {/* Guest Initials (if occupied) */}
                {seat.guest && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold">
                      {seat.guest.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-48 p-2 z-[1001]">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Seat {seat.seatNumber}</span>
                  {seat.guest?.rsvpStatus && (
                    <Badge
                      variant={
                        seat.guest.rsvpStatus === "APPROVED"
                          ? "default"
                          : seat.guest.rsvpStatus === "PENDING"
                          ? "outline"
                          : "destructive"
                      }
                      className="text-[10px] px-1 py-0"
                    >
                      {seat.guest.rsvpStatus}
                    </Badge>
                  )}
                </div>
                {seat.guest ? (
                  <div className="text-sm">{seat.guest.name}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Empty seat</div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
```

### 3.2 Seat Assignment Dialog

**File:** `components/seating/assign-seat-dialog.tsx` (NEW)

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { assignGuestToSeat, unassignSeat } from "@/actions/seating";

interface Guest {
  id: string;
  name: string;
  rsvpStatus?: string;
}

interface AssignSeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seatId: string;
  seatNumber: number;
  tableName: string;
  currentGuest?: Guest | null;
  availableGuests: Guest[];
  onAssignmentChange?: () => void;
}

export function AssignSeatDialog({
  open,
  onOpenChange,
  seatId,
  seatNumber,
  tableName,
  currentGuest,
  availableGuests,
  onAssignmentChange,
}: AssignSeatDialogProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const filteredGuests = availableGuests.filter((g) =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssign = async (guestId: string) => {
    setIsLoading(true);
    try {
      const result = await assignGuestToSeat(seatId, guestId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("guestAssignedToSeat"));
        onAssignmentChange?.();
        onOpenChange(false);
      }
    } catch {
      toast.error(t("assignmentError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    try {
      const result = await unassignSeat(seatId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("seatUnassigned"));
        onAssignmentChange?.();
        onOpenChange(false);
      }
    } catch {
      toast.error(t("unassignError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t("assignSeat", { table: tableName, seat: seatNumber })}
          </DialogTitle>
        </DialogHeader>

        {/* Current Assignment */}
        {currentGuest && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <div className="text-sm font-medium">{currentGuest.name}</div>
              {currentGuest.rsvpStatus && (
                <Badge variant="outline" className="mt-1 text-xs">
                  {currentGuest.rsvpStatus}
                </Badge>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleUnassign}
              disabled={isLoading}
            >
              <Icons.close className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Icons.search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchGuests")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Guest List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icons.users className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{t("noGuestsAvailable")}</p>
            </div>
          ) : (
            filteredGuests.map((guest) => (
              <Button
                key={guest.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleAssign(guest.id)}
                disabled={isLoading}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{guest.name}</span>
                  {guest.rsvpStatus && (
                    <Badge variant="outline" className="text-xs">
                      {guest.rsvpStatus}
                    </Badge>
                  )}
                </div>
              </Button>
            ))
          )}
        </div>

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {tc("cancel")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Phase 4: Enhanced Table Creation with Seat Configuration

### 4.1 Advanced Add Table Dialog

**File:** `components/seating/add-table-dialog-enhanced.tsx` (REPLACE `add-table-dialog.tsx`)

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { createTableWithSeats } from "@/actions/seating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";
import { TableColorTheme } from "./table-with-seats";
import { calculateSeatPositions, type SeatingArrangement, type TableShape } from "@/lib/seating/seat-calculator";

// Schema
const createTableSchema = z.object({
  weddingEventId: z.string(),
  name: z.string().min(1, "Table name is required"),
  capacity: z.number().int().min(1).max(100),
  shape: z.enum(["circle", "rectangle", "rectangleRounded", "concave", "concaveRounded"]),
  seatingArrangement: z.enum(["even", "bride-side", "sides-only", "custom"]),
  colorTheme: z.enum(["default", "blue", "green", "purple", "pink", "amber", "rose"]),
});

type CreateTableInput = z.infer<typeof createTableSchema>;

// Shape preview component
function ShapePreview({ shape, isSelected }: { shape: TableShape; isSelected: boolean }) {
  const shapeStyles: Record<TableShape, string> = {
    circle: "rounded-full",
    rectangle: "rounded-none",
    rectangleRounded: "rounded-lg",
    concave: "rounded-t-full rounded-b-none",
    concaveRounded: "rounded-t-full rounded-b-lg",
  };

  return (
    <div
      className={cn(
        "w-16 h-12 border-2 transition-all",
        shapeStyles[shape],
        isSelected
          ? "border-primary bg-primary/10"
          : "border-muted-foreground/30 bg-muted hover:border-primary/50"
      )}
    />
  );
}

// Seating arrangement preview
function ArrangementPreview({
  arrangement,
  shape,
  capacity,
  isSelected
}: {
  arrangement: SeatingArrangement;
  shape: TableShape;
  capacity: number;
  isSelected: boolean;
}) {
  // Calculate seat positions for preview
  const seats = calculateSeatPositions(capacity, shape, arrangement);

  return (
    <div className={cn(
      "relative w-24 h-20 border-2 rounded-lg transition-all",
      isSelected
        ? "border-primary bg-primary/10"
        : "border-muted-foreground/30 bg-muted hover:border-primary/50"
    )}>
      {/* Mini table */}
      <div className="absolute inset-0 m-4 bg-card border border-muted-foreground/20 rounded" />

      {/* Mini seats */}
      {seats.slice(0, 8).map((seat, idx) => {
        const x = 50 + seat.relativeX * 40; // Scale to preview size
        const y = 50 + seat.relativeY * 30;
        return (
          <div
            key={idx}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
    </div>
  );
}

// Color theme selector
function ColorThemeSelector({
  value,
  onChange
}: {
  value: TableColorTheme;
  onChange: (value: TableColorTheme) => void;
}) {
  const themes: { value: TableColorTheme; label: string; color: string }[] = [
    { value: "default", label: "Default", color: "bg-gray-200 dark:bg-gray-700" },
    { value: "blue", label: "Blue", color: "bg-blue-200 dark:bg-blue-900" },
    { value: "green", label: "Green", color: "bg-green-200 dark:bg-green-900" },
    { value: "purple", label: "Purple", color: "bg-purple-200 dark:bg-purple-900" },
    { value: "pink", label: "Pink", color: "bg-pink-200 dark:bg-pink-900" },
    { value: "amber", label: "Amber", color: "bg-amber-200 dark:bg-amber-900" },
    { value: "rose", label: "Rose", color: "bg-rose-200 dark:bg-rose-900" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {themes.map((theme) => (
        <button
          key={theme.value}
          type="button"
          onClick={() => onChange(theme.value)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
            value === theme.value
              ? "border-primary bg-primary/10"
              : "border-muted-foreground/20 hover:border-primary/50"
          )}
        >
          <div className={cn("w-8 h-8 rounded-full border", theme.color)} />
          <span className="text-xs">{theme.label}</span>
        </button>
      ))}
    </div>
  );
}

interface AddTableDialogEnhancedProps {
  eventId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddTableDialogEnhanced({
  eventId,
  open: controlledOpen,
  onOpenChange
}: AddTableDialogEnhancedProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const form = useForm<CreateTableInput>({
    resolver: zodResolver(createTableSchema),
    defaultValues: {
      weddingEventId: eventId,
      name: "",
      capacity: 10,
      shape: "circle",
      seatingArrangement: "even",
      colorTheme: "default",
    },
  });

  const watchedShape = form.watch("shape");
  const watchedCapacity = form.watch("capacity");
  const watchedArrangement = form.watch("seatingArrangement");

  async function onSubmit(data: CreateTableInput) {
    setIsLoading(true);
    try {
      const result = await createTableWithSeats(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("tableCreated"));
      setOpen(false);
      form.reset();
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    } catch {
      toast.error("Failed to create table");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addTable")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="seating">Seating</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Info */}
              <TabsContent value="basic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("tableName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("tableNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("capacity")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription>
                        {t("capacityDescription")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shape"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("tableShape")}</FormLabel>
                      <div className="grid grid-cols-3 gap-3">
                        {(["circle", "rectangle", "rectangleRounded"] as TableShape[]).map((shape) => (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => field.onChange(shape)}
                            className="flex flex-col items-center gap-2"
                          >
                            <ShapePreview shape={shape} isSelected={field.value === shape} />
                            <span className="text-xs">{t(`shapes.${shape}`)}</span>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Tab 2: Seating Arrangement */}
              <TabsContent value="seating" className="space-y-4">
                <FormField
                  control={form.control}
                  name="seatingArrangement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("seatingArrangement")}</FormLabel>
                      <FormDescription>
                        {t("seatingArrangementDescription")}
                      </FormDescription>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {(["even", "bride-side", "sides-only", "custom"] as SeatingArrangement[]).map((arr) => (
                          <button
                            key={arr}
                            type="button"
                            onClick={() => field.onChange(arr)}
                            className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 hover:border-primary/50 transition-all"
                          >
                            <ArrangementPreview
                              arrangement={arr}
                              shape={watchedShape}
                              capacity={watchedCapacity}
                              isSelected={field.value === arr}
                            />
                            <span className="text-xs font-medium">
                              {t(`arrangements.${arr}`)}
                            </span>
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preview */}
                <div className="p-4 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium mb-2 block">Preview</Label>
                  <div className="flex items-center justify-center h-40 bg-background rounded border">
                    <ArrangementPreview
                      arrangement={watchedArrangement}
                      shape={watchedShape}
                      capacity={watchedCapacity}
                      isSelected={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {watchedCapacity} seats arranged as "{t(`arrangements.${watchedArrangement}`)}"
                  </p>
                </div>
              </TabsContent>

              {/* Tab 3: Appearance */}
              <TabsContent value="appearance" className="space-y-4">
                <FormField
                  control={form.control}
                  name="colorTheme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("colorTheme")}</FormLabel>
                      <FormDescription>
                        {t("colorThemeDescription")}
                      </FormDescription>
                      <ColorThemeSelector
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                {tc("create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Phase 5: Canvas Scaling & Fullscreen Improvements

### 5.1 Responsive Canvas with Zoom Controls

**File:** `components/seating/floor-plan-canvas.tsx` (ENHANCED)

**Key Features:**
- Zoom in/out controls (50% - 200%)
- Pan with mouse drag when zoomed
- Auto-fit to container
- Smooth scaling of all elements
- Fullscreen mode fills viewport

```typescript
// Add to existing table-floor-plan.tsx:

// State for zoom
const [zoomLevel, setZoomLevel] = useState(1); // 1 = 100%
const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
const [isPanning, setIsPanning] = useState(false);

// Zoom controls
const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2));
const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
const handleResetZoom = () => {
  setZoomLevel(1);
  setPanOffset({ x: 0, y: 0 });
};

// Pan handling
const handleMouseDown = (e: React.MouseEvent) => {
  if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
    // Middle mouse or Ctrl+Left click to pan
    setIsPanning(true);
  }
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (isPanning) {
    setPanOffset(prev => ({
      x: prev.x + e.movementX,
      y: prev.y + e.movementY,
    }));
  }
};

const handleMouseUp = () => {
  setIsPanning(false);
};

// Apply zoom and pan transform
<div
  className="relative w-full h-full overflow-hidden"
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  style={{ cursor: isPanning ? "grabbing" : "default" }}
>
  <div
    style={{
      transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
      transformOrigin: "top left",
      transition: isPanning ? "none" : "transform 0.2s ease-out",
    }}
  >
    {/* Floor plan content */}
  </div>

  {/* Zoom Controls */}
  <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-background/90 backdrop-blur-sm rounded-lg border p-2 shadow-lg">
    <Button size="icon" variant="outline" onClick={handleZoomIn}>
      <Icons.zoomIn className="h-4 w-4" />
    </Button>
    <Button size="icon" variant="outline" onClick={handleResetZoom}>
      <span className="text-xs">{Math.round(zoomLevel * 100)}%</span>
    </Button>
    <Button size="icon" variant="outline" onClick={handleZoomOut}>
      <Icons.zoomOut className="h-4 w-4" />
    </Button>
  </div>
</div>
```

### 5.2 Fullscreen Height Auto-Fit

**Update fullscreen mode:**

```typescript
// In fullscreen mode, calculate available height
useEffect(() => {
  if (isFullscreen && fullscreenRef.current) {
    const updateFullscreenHeight = () => {
      const headerHeight = 60; // Fullscreen header
      const padding = 32; // Top and bottom padding
      const availableHeight = window.innerHeight - headerHeight - padding;
      setFloorHeight(availableHeight);
    };

    updateFullscreenHeight();
    window.addEventListener("resize", updateFullscreenHeight);

    return () => window.removeEventListener("resize", updateFullscreenHeight);
  }
}, [isFullscreen]);
```

---

## Phase 6: Server Actions for Seat Management

### 6.1 Seat Management Actions

**File:** `actions/seating.ts` (additions)

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { calculateSeatPositions } from "@/lib/seating/seat-calculator";

/**
 * Create table with seats
 */
export async function createTableWithSeats(input: {
  weddingEventId: string;
  name: string;
  capacity: number;
  shape: string;
  seatingArrangement: string;
  colorTheme: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify event ownership
    const event = await prisma.weddingEvent.findFirst({
      where: {
        id: input.weddingEventId,
        ownerId: user.id,
      },
    });

    if (!event) {
      return { error: "Event not found" };
    }

    // Calculate seat positions
    const seatPositions = calculateSeatPositions(
      input.capacity,
      input.shape as any,
      input.seatingArrangement as any
    );

    // Create table with seats in a transaction
    const table = await prisma.weddingTable.create({
      data: {
        weddingEventId: input.weddingEventId,
        name: input.name,
        capacity: input.capacity,
        shape: input.shape,
        seatingArrangement: input.seatingArrangement,
        colorTheme: input.colorTheme,
        seats: {
          create: seatPositions.map((pos) => ({
            seatNumber: pos.seatNumber,
            relativeX: pos.relativeX,
            relativeY: pos.relativeY,
            angle: pos.angle,
          })),
        },
      },
      include: {
        seats: true,
      },
    });

    revalidatePath(`/[locale]/events/${input.weddingEventId}/seating`);

    return { success: true, table };
  } catch (error) {
    console.error("Error creating table with seats:", error);
    return { error: "Failed to create table" };
  }
}

/**
 * Assign guest to specific seat
 */
export async function assignGuestToSeat(seatId: string, guestId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    // Verify guest belongs to user's event
    const guest = await prisma.guest.findFirst({
      where: {
        id: guestId,
        weddingEvent: {
          ownerId: user.id,
        },
      },
      include: {
        seatAssignment: true,
      },
    });

    if (!guest) {
      return { error: "Guest not found" };
    }

    // Unassign from previous seat if any
    if (guest.seatAssignment) {
      await prisma.tableSeat.update({
        where: { id: guest.seatAssignment.id },
        data: { guestId: null },
      });
    }

    // Assign to new seat
    await prisma.tableSeat.update({
      where: { id: seatId },
      data: { guestId },
    });

    revalidatePath("/[locale]/events/[eventId]/seating");

    return { success: true };
  } catch (error) {
    console.error("Error assigning guest to seat:", error);
    return { error: "Failed to assign guest" };
  }
}

/**
 * Unassign seat
 */
export async function unassignSeat(seatId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    await prisma.tableSeat.update({
      where: { id: seatId },
      data: { guestId: null },
    });

    revalidatePath("/[locale]/events/[eventId]/seating");

    return { success: true };
  } catch (error) {
    console.error("Error unassigning seat:", error);
    return { error: "Failed to unassign seat" };
  }
}

/**
 * Update seat position (for custom arrangements)
 */
export async function updateSeatPosition(
  seatId: string,
  relativeX: number,
  relativeY: number
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized" };
    }

    await prisma.tableSeat.update({
      where: { id: seatId },
      data: {
        relativeX,
        relativeY,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating seat position:", error);
    return { error: "Failed to update seat position" };
  }
}

/**
 * Get table with seats and guest assignments
 */
export async function getTableWithSeats(tableId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { error: "Unauthorized", table: null };
    }

    const table = await prisma.weddingTable.findFirst({
      where: {
        id: tableId,
        weddingEvent: {
          ownerId: user.id,
        },
      },
      include: {
        seats: {
          include: {
            guest: {
              include: {
                rsvp: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
          orderBy: {
            seatNumber: "asc",
          },
        },
      },
    });

    if (!table) {
      return { error: "Table not found", table: null };
    }

    return { success: true, table };
  } catch (error) {
    console.error("Error fetching table with seats:", error);
    return { error: "Failed to fetch table", table: null };
  }
}
```

---

## Phase 7: Implementation Timeline

### Week 1: Foundation
- [x] Plan creation
- [ ] Database schema migration
- [ ] Seat position calculator implementation
- [ ] Compact stats component

### Week 2: Visual Components
- [ ] TableWithSeats component
- [ ] Seat rendering and interaction
- [ ] Color themes implementation
- [ ] Shape preview components

### Week 3: Enhanced Dialogs
- [ ] Enhanced add table dialog with tabs
- [ ] Seating arrangement selector
- [ ] Assign seat dialog
- [ ] Visual previews

### Week 4: Canvas Improvements
- [ ] Zoom controls
- [ ] Pan functionality
- [ ] Fullscreen auto-fit
- [ ] Smooth scaling

### Week 5: Server Actions & Integration
- [ ] All seat management server actions
- [ ] Migration script for existing tables
- [ ] Integration with floor plan
- [ ] Testing

### Week 6: Polish & Testing
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] User testing & feedback

---

## Success Metrics

**Performance:**
- Stats card height reduced from 120px to 60px ✓
- Canvas zoom range: 50% - 200% ✓
- Smooth 60fps drag/drop operations ✓

**Features:**
- Individual seat visualization ✓
- Seat-level guest assignment ✓
- 7 color themes for tables ✓
- 4 seating arrangements ✓
- Auto-fit fullscreen mode ✓

**User Experience:**
- Intuitive seat assignment workflow
- Visual feedback for RSVP status
- Professional appearance
- Mobile-friendly interface

---

## Migration Strategy

### Existing Tables Migration

**File:** `prisma/migrations/add-seats-to-tables.ts`

```typescript
/**
 * Migration script to add seats to existing tables
 */

import { PrismaClient } from "@prisma/client";
import { calculateSeatPositions } from "@/lib/seating/seat-calculator";

const prisma = new PrismaClient();

async function migrateExistingTables() {
  console.log("Starting migration: Adding seats to existing tables...");

  const tables = await prisma.weddingTable.findMany({
    where: {
      seats: {
        none: {}, // Only tables without seats
      },
    },
  });

  console.log(`Found ${tables.length} tables without seats`);

  for (const table of tables) {
    console.log(`Migrating table: ${table.name} (${table.id})`);

    // Calculate seat positions
    const seatPositions = calculateSeatPositions(
      table.capacity,
      (table.shape || "circle") as any,
      "even" // Default to even distribution
    );

    // Create seats
    await prisma.tableSeat.createMany({
      data: seatPositions.map((pos) => ({
        tableId: table.id,
        seatNumber: pos.seatNumber,
        relativeX: pos.relativeX,
        relativeY: pos.relativeY,
        angle: pos.angle,
      })),
    });

    // Migrate existing TableAssignments to TableSeats
    const assignments = await prisma.tableAssignment.findMany({
      where: { tableId: table.id },
    });

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const seat = await prisma.tableSeat.findFirst({
        where: {
          tableId: table.id,
          seatNumber: i + 1,
        },
      });

      if (seat) {
        await prisma.tableSeat.update({
          where: { id: seat.id },
          data: { guestId: assignment.guestId },
        });
      }
    }

    console.log(`✓ Migrated ${seatPositions.length} seats for table ${table.name}`);
  }

  console.log("Migration complete!");
}

migrateExistingTables()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Run migration:**
```bash
npx prisma migrate dev --name add_table_seats
npx tsx prisma/migrations/add-seats-to-tables.ts
```

---

## Appendix: Translation Keys

Add to `messages/he.json` and `messages/en.json`:

```json
{
  "seating": {
    "colorTheme": "ערכת צבעים / Color Theme",
    "colorThemeDescription": "בחר צבע לשולחן / Choose a color for the table",
    "seatingArrangement": "סידור מקומות ישיבה / Seating Arrangement",
    "seatingArrangementDescription": "בחר כיצד לסדר את המקומות מסביב לשולחן / Choose how to arrange seats around the table",
    "arrangements": {
      "even": "אחיד / Even",
      "bride-side": "צד כלה/חתן / Bride/Groom Sides",
      "sides-only": "צדדים בלבד / Sides Only",
      "custom": "מותאם אישית / Custom"
    },
    "assignSeat": "הצב אורח - שולחן {{table}}, מקום {{seat}} / Assign Guest - Table {{table}}, Seat {{seat}}",
    "guestAssignedToSeat": "אורח שובץ למקום / Guest assigned to seat",
    "seatUnassigned": "מקום פונה / Seat unassigned",
    "noGuestsAvailable": "אין אורחים זמינים / No guests available"
  }
}
```

---

**End of Plan**

*This comprehensive plan transforms the seating system into a professional, visual floor planning tool with individual seat management, intuitive controls, and a polished user experience.*
