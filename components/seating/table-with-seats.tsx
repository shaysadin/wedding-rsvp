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
    rsvpStatus?: "ACCEPTED" | "PENDING" | "DECLINED" | "MAYBE";
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

const SEAT_SIZE = 32; // Seat chair size in pixels

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
      {/* Individual Seats - rendered BEFORE table so they appear behind */}
      {seats.map((seat) => {
        // Position chairs further out from center so they sit at the table edge
        // Use 1.15 to keep chairs close to edge without extending too far
        const distance = 1.15;
        const adjustedX = seat.relativeX * distance;
        const adjustedY = seat.relativeY * distance;

        const absolutePos = seatRelativeToAbsolute(
          adjustedX,
          adjustedY,
          0,
          0,
          table.width,
          table.height,
          0 // Don't rotate seats with table - they should stay upright
        );

        const seatX = absolutePos.x - SEAT_SIZE / 2;
        const seatY = absolutePos.y - SEAT_SIZE / 2;

        // Determine chair color based on guest status
        let chairColor = "#94a3b8"; // muted color for empty
        if (seat.guest) {
          if (seat.guest.rsvpStatus === "ACCEPTED") {
            chairColor = "#22c55e"; // green
          } else if (seat.guest.rsvpStatus === "PENDING") {
            chairColor = "#f59e0b"; // amber
          } else if (seat.guest.rsvpStatus === "DECLINED") {
            chairColor = "#ef4444"; // red
          } else {
            chairColor = "#3b82f6"; // blue for occupied
          }
        }

        // Use the pre-calculated angle from seat position
        // The angle is already set correctly based on table shape and arrangement
        const angleToCenter = seat.angle;

        return (
          <Popover key={seat.id}>
            <PopoverTrigger asChild>
              <div
                className={cn(
                  "absolute transition-all cursor-pointer",
                  hoveredSeat === seat.id && "scale-125 drop-shadow-lg",
                  !seat.guest && "hover:scale-110"
                )}
                style={{
                  left: seatX,
                  top: seatY,
                  width: SEAT_SIZE,
                  height: SEAT_SIZE,
                  zIndex: hoveredSeat === seat.id ? 10 : 0,
                  transform: `rotate(${angleToCenter}deg)`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeatClick?.(seat.id, seat.seatNumber);
                }}
                onMouseEnter={() => setHoveredSeat(seat.id)}
                onMouseLeave={() => setHoveredSeat(null)}
              >
                <ChairIcon color={chairColor} className="w-full h-full" />
                {/* Seat Number Badge (only show if empty) */}
                {!seat.guest && (
                  <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full w-3 h-3 flex items-center justify-center border border-gray-300 dark:border-gray-600">
                    <span className="text-[6px] font-bold">{seat.seatNumber}</span>
                  </div>
                )}
                {/* Guest Initial Badge (if occupied) */}
                {seat.guest && (
                  <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center border-2 border-current shadow-sm" style={{ borderColor: chairColor }}>
                    <span className="text-[8px] font-bold">
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
                        seat.guest.rsvpStatus === "ACCEPTED"
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

      {/* Table Body - rendered AFTER seats so it appears in front */}
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
        style={{ zIndex: 1 }}
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
    </div>
  );
}
