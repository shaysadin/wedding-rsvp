"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { calculateSeatPositions, seatRelativeToAbsolute, type TableShape, type SeatingArrangement } from "@/lib/seating/seat-calculator";

export type TableColorTheme = "default" | "blue" | "green" | "purple" | "pink" | "amber" | "rose";

// Guest assigned to a table
export interface TableGuest {
  id: string;
  name: string;
  rsvpStatus?: "ACCEPTED" | "PENDING" | "DECLINED" | "MAYBE";
  guestCount: number; // Number of seats this guest occupies (party size)
  isArrived?: boolean;
}

interface TableWithSeatsProps {
  table: {
    id: string;
    name: string;
    capacity: number;
    shape: string;
    seatingArrangement?: string;
    colorTheme?: TableColorTheme;
    width: number;
    height: number;
    rotation: number;
  };
  // Guests assigned to this table (simplified - no seat positions needed)
  assignments: TableGuest[];
  positionX: number;
  positionY: number;
  colorMode?: "rsvp" | "arrival"; // defaults to "rsvp"
  onChairClick?: (chairIndex: number, guest: TableGuest | null) => void;
  onTableClick?: () => void;
  isSelected?: boolean;
}

// Color theme configurations
const COLOR_THEMES: Record<TableColorTheme, {
  table: string;
  tableBorder: string;
  chairEmpty: string;
  chairApproved: string;
  chairPending: string;
  chairDeclined: string;
  chairMaybe: string;
}> = {
  default: {
    table: "bg-card",
    tableBorder: "border-primary/50",
    chairEmpty: "#94a3b8", // gray for empty
    chairApproved: "#22c55e", // green
    chairPending: "#f59e0b", // amber
    chairDeclined: "#ef4444", // red
    chairMaybe: "#8b5cf6", // purple
  },
  blue: {
    table: "bg-blue-50 dark:bg-blue-950/30",
    tableBorder: "border-blue-400",
    chairEmpty: "#94a3b8",
    chairApproved: "#22c55e",
    chairPending: "#f59e0b",
    chairDeclined: "#ef4444",
    chairMaybe: "#8b5cf6",
  },
  green: {
    table: "bg-green-50 dark:bg-green-950/30",
    tableBorder: "border-green-400",
    chairEmpty: "#94a3b8",
    chairApproved: "#22c55e",
    chairPending: "#f59e0b",
    chairDeclined: "#ef4444",
    chairMaybe: "#8b5cf6",
  },
  purple: {
    table: "bg-purple-50 dark:bg-purple-950/30",
    tableBorder: "border-purple-400",
    chairEmpty: "#94a3b8",
    chairApproved: "#22c55e",
    chairPending: "#f59e0b",
    chairDeclined: "#ef4444",
    chairMaybe: "#8b5cf6",
  },
  pink: {
    table: "bg-pink-50 dark:bg-pink-950/30",
    tableBorder: "border-pink-400",
    chairEmpty: "#94a3b8",
    chairApproved: "#22c55e",
    chairPending: "#f59e0b",
    chairDeclined: "#ef4444",
    chairMaybe: "#8b5cf6",
  },
  amber: {
    table: "bg-amber-50 dark:bg-amber-950/30",
    tableBorder: "border-amber-400",
    chairEmpty: "#94a3b8",
    chairApproved: "#22c55e",
    chairPending: "#f59e0b",
    chairDeclined: "#ef4444",
    chairMaybe: "#8b5cf6",
  },
  rose: {
    table: "bg-rose-50 dark:bg-rose-950/30",
    tableBorder: "border-rose-400",
    chairEmpty: "#94a3b8",
    chairApproved: "#22c55e",
    chairPending: "#f59e0b",
    chairDeclined: "#ef4444",
    chairMaybe: "#8b5cf6",
  },
};

const CHAIR_SIZE = 32; // Chair size in pixels (slightly bigger)

// Chair SVG Component
function ChairIcon({ color, className }: { color: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Chair seat */}
      <rect x="6" y="10" width="12" height="3" rx="1" fill={color} />
      {/* Chair back */}
      <rect x="7" y="5" width="10" height="5" rx="1" fill={color} />
      {/* Chair legs */}
      <rect x="7" y="13" width="2" height="6" rx="0.5" fill={color} />
      <rect x="15" y="13" width="2" height="6" rx="0.5" fill={color} />
    </svg>
  );
}

export function TableWithSeats({
  table,
  assignments,
  positionX,
  positionY,
  colorMode = "rsvp",
  onChairClick,
  onTableClick,
  isSelected,
}: TableWithSeatsProps) {
  const [hoveredChair, setHoveredChair] = useState<number | null>(null);

  const theme = COLOR_THEMES[table.colorTheme || "default"];
  const shapeClasses: Record<string, string> = {
    square: "rounded-none",
    circle: "rounded-full",
    rectangle: "rounded-none",
    oval: "rounded-[50%]",
  };

  // Calculate chair positions based on table capacity and shape
  const chairPositions = useMemo(() => {
    return calculateSeatPositions(
      table.capacity,
      (table.shape || "circle") as TableShape,
      (table.seatingArrangement || "even") as SeatingArrangement
    );
  }, [table.capacity, table.shape, table.seatingArrangement]);

  // Expand assignments based on guest count (party size)
  // e.g., Guest A with count 2 fills chairs 0,1; Guest B with count 3 fills chairs 2,3,4
  const expandedChairMap = useMemo(() => {
    const map: (TableGuest | null)[] = [];
    for (const guest of assignments) {
      const count = guest.guestCount || 1;
      for (let i = 0; i < count; i++) {
        map.push(guest);
      }
    }
    return map;
  }, [assignments]);

  // Map chair index to guest (accounting for party sizes)
  const getGuestAtChair = (chairIndex: number): TableGuest | null => {
    return expandedChairMap[chairIndex] || null;
  };

  // Calculate total seats used for display
  const totalSeatsUsed = expandedChairMap.length;

  // Get chair color based on guest status
  const getChairColor = (guest: TableGuest | null): string => {
    if (!guest) return theme.chairEmpty;
    if (colorMode === "arrival") {
      return guest.isArrived ? theme.chairApproved : theme.chairEmpty;
    }
    switch (guest.rsvpStatus) {
      case "ACCEPTED": return theme.chairApproved;
      case "PENDING": return theme.chairPending;
      case "DECLINED": return theme.chairDeclined;
      case "MAYBE": return theme.chairMaybe;
      default: return theme.chairPending;
    }
  };

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
      {/* Chairs - rendered BEFORE table so they appear behind */}
      {chairPositions.map((position, index) => {
        const guest = getGuestAtChair(index);
        const chairColor = getChairColor(guest);

        // Position chairs slightly outside the table edge
        const distance = 1.15;
        const adjustedX = position.relativeX * distance;
        const adjustedY = position.relativeY * distance;

        const absolutePos = seatRelativeToAbsolute(
          adjustedX,
          adjustedY,
          0,
          0,
          table.width,
          table.height,
          0 // Don't rotate chairs with table rotation
        );

        const chairX = absolutePos.x - CHAIR_SIZE / 2;
        const chairY = absolutePos.y - CHAIR_SIZE / 2;

        return (
          <Popover key={index}>
            <PopoverTrigger asChild>
              <div
                className={cn(
                  "absolute cursor-pointer transition-transform duration-150",
                  hoveredChair === index && "scale-125 drop-shadow-lg",
                  !guest && "hover:scale-110"
                )}
                style={{
                  left: chairX,
                  top: chairY,
                  width: CHAIR_SIZE,
                  height: CHAIR_SIZE,
                  zIndex: hoveredChair === index ? 10 : 0,
                  transform: `rotate(${position.angle}deg)`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChairClick?.(index, guest);
                }}
                onMouseEnter={() => setHoveredChair(index)}
                onMouseLeave={() => setHoveredChair(null)}
              >
                <ChairIcon color={chairColor} className="w-full h-full" />
                {/* Chair Number Badge (only show if empty) - COMMENTED OUT
                {!guest && (
                  <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                    <span className="text-[7px] font-bold">{index + 1}</span>
                  </div>
                )}
                */}
                {/* Guest Initial Badge (if occupied) - COMMENTED OUT
                {guest && (
                  <div
                    className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full w-5 h-5 flex items-center justify-center border-2 shadow-sm"
                    style={{ borderColor: chairColor }}
                  >
                    <span className="text-[10px] font-bold">
                      {guest.name.charAt(0)}
                    </span>
                  </div>
                )}
                */}
              </div>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-48 p-2 z-[1001]">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Chair {index + 1}</span>
                  {guest?.rsvpStatus && (
                    <Badge
                      variant={
                        guest.rsvpStatus === "ACCEPTED"
                          ? "default"
                          : guest.rsvpStatus === "PENDING"
                          ? "outline"
                          : "destructive"
                      }
                      className="text-[10px] px-1 py-0"
                    >
                      {guest.rsvpStatus}
                    </Badge>
                  )}
                </div>
                {guest ? (
                  <div className="text-sm">{guest.name}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Empty chair</div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      })}

      {/* Table Body - rendered AFTER chairs so it appears in front */}
      <div
        className={cn(
          "relative w-full h-full border-2 shadow-md transition-shadow duration-150",
          "flex items-center justify-center cursor-pointer",
          theme.table,
          theme.tableBorder,
          shapeClasses[table.shape] || shapeClasses.circle,
          isSelected && "ring-2 ring-primary ring-offset-2",
          "hover:shadow-lg"
        )}
        style={{ zIndex: 1 }}
        onClick={onTableClick}
      >
        {/* Table Label */}
        <div className="text-center pointer-events-none">
          <div className="font-semibold text-base">{table.name}</div>
          <div className="text-sm text-muted-foreground">
            {totalSeatsUsed}/{table.capacity}
          </div>
        </div>
      </div>
    </div>
  );
}
