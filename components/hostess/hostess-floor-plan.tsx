"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { TableWithSeats, type TableGuest } from "@/components/seating/table-with-seats";
import { Icons } from "@/components/shared/icons";

interface VenueBlock {
  id: string;
  name: string;
  type: string;
  shape: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
}

interface TableWithFloorData {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  seatingArrangement?: string;
  colorTheme?: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  guests: {
    id: string;
    name: string;
    guestCount: number;
    isArrived: boolean;
  }[];
}

interface HostessFloorPlanProps {
  tables: TableWithFloorData[];
  venueBlocks: VenueBlock[];
  canvasWidth: number;
  canvasHeight: number;
  locale: string;
  onTableClick: (tableId: string) => void;
}

// Venue block icon mapping
const VENUE_BLOCK_ICONS: Record<string, keyof typeof Icons> = {
  dj: "music",
  bar: "wine",
  stage: "mic",
  danceFloor: "music2",
  entrance: "doorOpen",
  photoBooth: "camera",
  buffet: "utensils",
  cake: "cake",
  gifts: "gift",
  other: "box",
};

// Venue block color mapping
const VENUE_BLOCK_COLORS: Record<string, string> = {
  dj: "bg-purple-500/20 border-purple-500/50",
  bar: "bg-amber-500/20 border-amber-500/50",
  stage: "bg-red-500/20 border-red-500/50",
  danceFloor: "bg-pink-500/20 border-pink-500/50",
  entrance: "bg-green-500/20 border-green-500/50",
  photoBooth: "bg-blue-500/20 border-blue-500/50",
  buffet: "bg-orange-500/20 border-orange-500/50",
  cake: "bg-rose-500/20 border-rose-500/50",
  gifts: "bg-teal-500/20 border-teal-500/50",
  other: "bg-gray-500/20 border-gray-500/50",
};

// Venue block shape classes
const VENUE_BLOCK_SHAPE_CLASSES: Record<string, string> = {
  square: "rounded-none",
  circle: "rounded-full",
  rectangle: "rounded-none",
  oval: "rounded-[50%]",
};

export function HostessFloorPlan({
  tables,
  venueBlocks,
  canvasWidth,
  canvasHeight,
  locale,
  onTableClick,
}: HostessFloorPlanProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate scale to fit container
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const scaleX = containerWidth / canvasWidth;
      setScale(Math.min(1, scaleX));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [canvasWidth]);

  // Position tables that don't have saved positions using a grid fallback
  const positionedTables = useMemo(() => {
    return tables.map((table, index) => {
      if (table.positionX !== 0 || table.positionY !== 0) {
        return table;
      }
      // Grid fallback for tables without positions
      const cols = Math.ceil(Math.sqrt(tables.length));
      const row = Math.floor(index / cols);
      const col = index % cols;
      const spacingX = canvasWidth / (cols + 1);
      const spacingY = canvasHeight / (Math.ceil(tables.length / cols) + 1);
      return {
        ...table,
        positionX: spacingX * (col + 1) - table.width / 2,
        positionY: spacingY * (row + 1) - table.height / 2,
      };
    });
  }, [tables, canvasWidth, canvasHeight]);

  return (
    <div ref={containerRef} className="w-full overflow-x-auto">
      <div style={{ width: canvasWidth * scale, height: canvasHeight * scale }}>
        <div
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
          className="relative border-2 border-dashed rounded-lg bg-muted/20"
        >
          {/* Venue blocks */}
          {venueBlocks.map((block) => {
            const iconKey = VENUE_BLOCK_ICONS[block.type] || "box";
            const IconComponent = Icons[iconKey] as React.ComponentType<{ className?: string }>;
            const colorClasses = VENUE_BLOCK_COLORS[block.type] || VENUE_BLOCK_COLORS.other;
            const shapeClass = VENUE_BLOCK_SHAPE_CLASSES[block.shape] || "rounded-md";

            return (
              <div
                key={block.id}
                className={cn(
                  "absolute border-2 flex flex-col items-center justify-center pointer-events-none",
                  colorClasses,
                  shapeClass
                )}
                style={{
                  left: block.positionX,
                  top: block.positionY,
                  width: block.width,
                  height: block.height,
                  transform: `rotate(${block.rotation}deg)`,
                }}
              >
                {IconComponent && <IconComponent className="h-5 w-5 opacity-60" />}
                <span className="text-[10px] font-medium opacity-70 mt-0.5 text-center px-1 truncate max-w-full">
                  {block.name}
                </span>
              </div>
            );
          })}

          {/* Tables */}
          {positionedTables.map((table) => {
            // Map guests to TableGuest format for TableWithSeats
            const assignments: TableGuest[] = table.guests.map((g) => ({
              id: g.id,
              name: g.name,
              guestCount: g.guestCount,
              rsvpStatus: "ACCEPTED" as const,
              isArrived: g.isArrived,
            }));

            return (
              <TableWithSeats
                key={table.id}
                table={{
                  id: table.id,
                  name: table.name,
                  capacity: table.capacity,
                  shape: table.shape,
                  seatingArrangement: table.seatingArrangement,
                  colorTheme: (table.colorTheme as any) || "default",
                  width: table.width,
                  height: table.height,
                  rotation: table.rotation,
                }}
                assignments={assignments}
                positionX={table.positionX}
                positionY={table.positionY}
                colorMode="arrival"
                onTableClick={() => onTableClick(table.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
