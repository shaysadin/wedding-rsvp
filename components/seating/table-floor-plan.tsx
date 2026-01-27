"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Maximize2, Minimize2 } from "lucide-react";

import { updateTablePosition, updateTableSize, updateTableRotation, updateVenueBlockPosition, updateVenueBlockSize, updateVenueBlockRotation, deleteVenueBlock, deleteTable, getCanvasDimensions, updateCanvasDimensions } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Icons } from "@/components/shared/icons";
import { TableWithSeats, type TableColorTheme } from "@/components/seating/table-with-seats";
import { ManageTableGuestDialog } from "@/components/seating/assign-seat-dialog";
import { assignGuestsToTable, removeGuestFromTable, getGuestsForAssignment } from "@/actions/seating";

interface TableGuest {
  id: string;
  name: string;
  side?: string | null;
  groupName?: string | null;
  expectedGuests: number;
  rsvp?: {
    status: string;
    guestCount: number;
  } | null;
}

interface TableAssignment {
  id: string;
  guest: TableGuest;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  shape?: string | null;
  colorTheme?: string | null;
  seatingArrangement?: string | null;
  positionX?: number | null;
  positionY?: number | null;
  width?: number;
  height?: number;
  rotation?: number;
  assignments: TableAssignment[];
  seatsUsed: number;
  seatsAvailable: number;
}

interface VenueBlock {
  id: string;
  name: string;
  type: string;
  shape?: string | null;
  positionX?: number | null;
  positionY?: number | null;
  width: number;
  height: number;
  rotation: number;
}

interface TableFloorPlanProps {
  tables: Table[];
  venueBlocks?: VenueBlock[];
  eventId: string;
  onAssignGuests: (tableId: string) => void;
  onEditTable: (table: { id: string; name: string; capacity: number; shape?: string | null; seatingArrangement?: string | null; colorTheme?: string | null }) => void;
}

interface LocalPosition {
  x: number;
  y: number;
}

const GRID_SIZE = 20; // Snap to grid
const DEFAULT_FLOOR_WIDTH = 1200; // Default floor width
const DEFAULT_FLOOR_HEIGHT = 800; // Default floor height
const MIN_FLOOR_WIDTH = 600;
const MIN_FLOOR_HEIGHT = 300;
const MAX_FLOOR_WIDTH = 4000; // Allow very wide floor plans
const MAX_FLOOR_HEIGHT = 3000; // Allow very large floor plans
const MIN_SIZE = 40;
const MAX_SIZE = 400;
const DEFAULT_TABLE_SIZE = {
  square: { width: 75, height: 75 },
  circle: { width: 75, height: 75 },
  rectangle: { width: 120, height: 60 },
  oval: { width: 100, height: 70 },
};

// SVG component for concave (crescent) shape - half-ring with parallel curves
function ConcaveShape({
  width,
  height,
  rounded = false,
  className,
  borderColor,
}: {
  width: number;
  height: number;
  rounded?: boolean;
  className?: string;
  borderColor: string;
}) {
  // Create a half-ring (crescent) with concentric semicircles
  // The thickness of the ring is about 35% of the total height
  const centerX = width / 2;
  const centerY = height; // Center at bottom middle
  const outerRadiusX = width / 2;
  const outerRadiusY = height; // Full height for outer arc
  const thickness = height * 0.35; // Ring thickness
  const innerRadiusX = outerRadiusX - thickness;
  const innerRadiusY = outerRadiusY - thickness;

  // Path: outer arc (clockwise), then inner arc (counter-clockwise)
  // Start at bottom-left of outer arc, arc to bottom-right,
  // then inner arc from right to left
  const shapePath = `
    M 0 ${height}
    A ${outerRadiusX} ${outerRadiusY} 0 0 1 ${width} ${height}
    L ${centerX + innerRadiusX} ${height}
    A ${innerRadiusX} ${innerRadiusY} 0 0 0 ${centerX - innerRadiusX} ${height}
    Z
  `;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("absolute inset-0", className)}
      style={{ overflow: 'visible' }}
    >
      <path
        d={shapePath}
        fill="hsl(var(--card))"
        stroke={borderColor}
        strokeWidth={2}
      />
    </svg>
  );
}

interface LocalSize {
  width: number;
  height: number;
}

// Guest type for chair display
interface ChairGuest {
  id: string;
  name: string;
  rsvpStatus?: "ACCEPTED" | "PENDING" | "DECLINED" | "MAYBE";
  guestCount: number; // Number of seats this guest occupies (party size)
}

function DraggableTable({
  table,
  localPosition,
  localSize,
  localRotation,
  onAssignGuests,
  onEditTable,
  onResizeStart,
  onResize,
  onResizeEnd,
  onRotate,
  isResizing,
  onChairClick,
}: {
  table: Table;
  localPosition?: LocalPosition;
  localSize?: LocalSize;
  localRotation?: number;
  onAssignGuests: (tableId: string) => void;
  onEditTable: (table: { id: string; name: string; capacity: number; shape?: string | null; seatingArrangement?: string | null; colorTheme?: string | null }) => void;
  onResizeStart: (id: string, type: "table" | "block") => void;
  onResize: (id: string, type: "table" | "block", width: number, height: number) => void;
  onResizeEnd: (id: string, type: "table" | "block") => void;
  onRotate: (id: string, type: "table" | "block") => void;
  isResizing: boolean;
  onChairClick?: (tableId: string, tableName: string, chairIndex: number, guest: ChairGuest | null) => void;
}) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    data: { table },
    disabled: isResizing,
  });

  const handleDeleteTable = async () => {
    try {
      const result = await deleteTable(table.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("tableDeleted"));
        // Optimistic update - remove table immediately
        window.dispatchEvent(new CustomEvent("seating-data-changed", {
          detail: { type: "table-deleted", tableId: table.id },
        }));
      }
    } catch {
      toast.error(t("deleteTableError"));
    }
  };

  const shape = (table.shape || "circle") as keyof typeof DEFAULT_TABLE_SIZE;
  const defaultSize = DEFAULT_TABLE_SIZE[shape] || DEFAULT_TABLE_SIZE.circle;
  const width = localSize?.width ?? table.width ?? defaultSize.width;
  const height = localSize?.height ?? table.height ?? defaultSize.height;
  const isOverCapacity = table.seatsUsed > table.capacity;
  const rotation = localRotation ?? table.rotation ?? 0;
  const isCircle = shape === "circle";
  const isOval = shape === "oval";
  const borderColor = isOverCapacity ? "hsl(var(--destructive))" : "hsl(var(--primary) / 0.5)";

  // Use local position if available, otherwise fall back to table's saved position
  const posX = localPosition?.x ?? table.positionX ?? 50;
  const posY = localPosition?.y ?? table.positionY ?? 50;

  const style = {
    position: "absolute" as const,
    left: posX,
    top: posY,
    width,
    height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${rotation}deg)`
      : `rotate(${rotation}deg)`,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const shapeClasses: Record<string, string> = {
    square: "rounded-none",
    circle: "rounded-full",
    rectangle: "rounded-none",
    oval: "rounded-[50%]", // 50% radius creates ellipse
  };

  // Convert assignments to the format expected by TableWithSeats
  // Use rsvp.guestCount if available, otherwise fall back to expectedGuests
  const tableAssignments: ChairGuest[] = table.assignments.map((assignment) => ({
    id: assignment.guest.id,
    name: assignment.guest.name,
    rsvpStatus: (assignment.guest.rsvp?.status as ChairGuest['rsvpStatus']) || "PENDING",
    guestCount: assignment.guest.rsvp?.guestCount || assignment.guest.expectedGuests || 1,
  }));

  return (
    <>
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          ref={setNodeRef}
          style={{
            position: "absolute" as const,
            left: posX,
            top: posY,
            width,
            height,
            zIndex: isDragging ? 1000 : 1,
            opacity: isDragging ? 0.8 : 1,
            touchAction: "none", // Prevent scroll during drag on touch devices
            willChange: "transform", // Always enable hardware acceleration
            backfaceVisibility: "hidden",
          }}
          {...(isResizing ? {} : listeners)}
          {...(isResizing ? {} : attributes)}
          className={cn(
            "group relative",
            !isResizing && "cursor-grab active:cursor-grabbing"
          )}
          onDoubleClick={() => {
            setPopoverOpen(false);
            onEditTable(table);
          }}
        >
          {/* Use TableWithSeats component for visual rendering */}
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: transform
                ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${rotation}deg)`
                : `rotate(${rotation}deg)`,
              willChange: "transform",
              backfaceVisibility: "hidden",
            }}
          >
            <TableWithSeats
              table={{
                id: table.id,
                name: table.name,
                capacity: table.capacity,
                shape: shape,
                seatingArrangement: table.seatingArrangement || "even",
                colorTheme: (table.colorTheme as TableColorTheme) || "default",
                width,
                height,
                rotation: 0, // Rotation is handled by parent div
              }}
              assignments={tableAssignments}
              positionX={0}
              positionY={0}
              onChairClick={(chairIndex, guest) => {
                onChairClick?.(table.id, table.name, chairIndex, guest);
              }}
              onTableClick={() => setPopoverOpen(true)}
            />
          </div>

          {/* Rotation button - only for non-circular shapes */}
          {!isCircle && !isOval && (
            <button
              type="button"
              className="absolute -top-3 -right-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-primary/90"
              onClick={(e) => {
                e.stopPropagation();
                onRotate(table.id, "table");
              }}
              title={t("rotate45")}
            >
              <Icons.rotateCw className="h-3 w-3" />
            </button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent side="right" className="w-56 z-[1001]">
        <div className="space-y-2">
          <p className="font-semibold">{table.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("seatsUsed", { used: table.seatsUsed, total: table.capacity })}
          </p>
          {table.assignments.length > 0 && (
            <div className="text-xs space-y-0.5 mt-2">
              <p className="font-medium">{t("assignedGuests")}:</p>
              {table.assignments.slice(0, 5).map((a) => (
                <p key={a.id} className="text-muted-foreground">
                  {a.guest.name}
                </p>
              ))}
              {table.assignments.length > 5 && (
                <p className="text-muted-foreground">
                  +{table.assignments.length - 5} more
                </p>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setPopoverOpen(false);
                onAssignGuests(table.id);
              }}
            >
              <Icons.userPlus className="me-2 h-4 w-4" />
              {t("assignGuests")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setPopoverOpen(false);
                onEditTable(table);
              }}
            >
              <Icons.pencil className="me-2 h-4 w-4" />
              {t("editTable")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="w-full justify-start"
              onClick={() => {
                setPopoverOpen(false);
                setShowDeleteConfirm(true);
              }}
            >
              <Icons.trash className="me-2 h-4 w-4" />
              {tc("delete")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTableTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteTableDescription", { name: table.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteTable}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {tc("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}

// Icon mapping for venue block types
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

// Color mapping for venue block types
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

// Shape classes for venue blocks
const VENUE_BLOCK_SHAPE_CLASSES: Record<string, string> = {
  square: "rounded-none",
  circle: "rounded-full",
  rectangle: "rounded-none",
  oval: "rounded-[50%]", // 50% radius creates ellipse
};

function DraggableVenueBlock({
  block,
  localPosition,
  localSize,
  localRotation,
  onDelete,
  onResizeStart,
  onResize,
  onResizeEnd,
  onRotate,
  isResizing,
}: {
  block: VenueBlock;
  localPosition?: LocalPosition;
  localSize?: LocalSize;
  localRotation?: number;
  onDelete: (blockId: string) => void;
  onResizeStart: (id: string, type: "table" | "block") => void;
  onResize: (id: string, type: "table" | "block", width: number, height: number) => void;
  onResizeEnd: (id: string, type: "table" | "block") => void;
  onRotate: (id: string, type: "table" | "block") => void;
  isResizing: boolean;
}) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block-${block.id}`,
    data: { block, type: "venue-block" },
    disabled: isResizing,
  });

  const IconComponent = Icons[VENUE_BLOCK_ICONS[block.type] || "box"];
  const colorClasses = VENUE_BLOCK_COLORS[block.type] || VENUE_BLOCK_COLORS.other;
  const shapeClass = VENUE_BLOCK_SHAPE_CLASSES[block.shape || "rectangle"] || VENUE_BLOCK_SHAPE_CLASSES.rectangle;
  const isCircle = block.shape === "circle";
  const isOval = block.shape === "oval";

  // Use local size if available, otherwise fall back to block's saved size
  const width = localSize?.width ?? block.width;
  const height = localSize?.height ?? block.height;
  const rotation = localRotation ?? block.rotation ?? 0;

  // Get border color from colorClasses (extract the border color)
  const borderColorMap: Record<string, string> = {
    dj: "hsl(270, 60%, 50%)",
    bar: "hsl(38, 60%, 50%)",
    stage: "hsl(0, 60%, 50%)",
    danceFloor: "hsl(330, 60%, 50%)",
    entrance: "hsl(120, 60%, 50%)",
    photoBooth: "hsl(210, 60%, 50%)",
    buffet: "hsl(30, 60%, 50%)",
    cake: "hsl(350, 60%, 50%)",
    gifts: "hsl(170, 60%, 50%)",
    other: "hsl(0, 0%, 50%)",
  };
  const blockBorderColor = borderColorMap[block.type] || borderColorMap.other;

  // Use local position if available, otherwise fall back to block's saved position
  const posX = localPosition?.x ?? block.positionX ?? 50;
  const posY = localPosition?.y ?? block.positionY ?? 50;

  const style = {
    position: "absolute" as const,
    left: posX,
    top: posY,
    width,
    height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) rotate(${rotation}deg)`
      : `rotate(${rotation}deg)`,
    zIndex: isDragging ? 1000 : 0,
    opacity: isDragging ? 0.8 : 1,
    touchAction: "none" as const, // Prevent scroll during drag on touch devices
    willChange: "transform" as const, // Always enable hardware acceleration
    backfaceVisibility: "hidden" as const,
  };


  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            {...(isResizing ? {} : listeners)}
            {...(isResizing ? {} : attributes)}
            className={cn(
              "flex flex-col items-center justify-center shadow-sm transition-shadow group border-2",
              !isResizing && "cursor-grab active:cursor-grabbing",
              colorClasses,
              shapeClass,
              isDragging && "shadow-lg"
            )}
          >
            <IconComponent className="h-6 w-6 text-muted-foreground pointer-events-none z-10" />
            <span className="text-xs font-medium text-center truncate max-w-[90%] mt-1 pointer-events-none z-10">
              {block.name}
            </span>

            {/* Rotation button - only for non-circular shapes */}
            {!isCircle && !isOval && (
              <button
                type="button"
                className="absolute -top-3 -right-3 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-primary/90 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  onRotate(block.id, "block");
                }}
                title={t("rotate45")}
              >
                <Icons.rotateCw className="h-3 w-3" />
              </button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-48 z-[1001]">
          <div className="space-y-2">
            <p className="font-semibold">{block.name}</p>
            <p className="text-xs text-muted-foreground">
              {t(`venueBlocks.types.${block.type}`)}
            </p>
            <div className="flex flex-col gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="destructive"
                className="w-full justify-start"
                onClick={() => {
                  setPopoverOpen(false);
                  setShowDeleteConfirm(true);
                }}
              >
                <Icons.trash className="me-2 h-4 w-4" />
                {tc("delete")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("venueBlocks.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("venueBlocks.deleteDescription", { name: block.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(block.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface FloorAreaProps {
  children: React.ReactNode;
  width: number;
  height: number;
  isFullscreen?: boolean;
  fullscreenButton?: React.ReactNode;
}

const FloorArea = React.forwardRef<HTMLDivElement, FloorAreaProps>(
  function FloorArea({ children, width, height, isFullscreen, fullscreenButton }, ref) {
    const { setNodeRef, isOver } = useDroppable({
      id: "floor-area",
    });
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isDraggingToScroll = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const rafId = useRef<number | null>(null);
    const lastMouseX = useRef(0);

    // Combine refs for both droppable and measurement
    const combinedRef = useCallback((node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref, setNodeRef]);

    // Cleanup RAF on unmount
    useEffect(() => {
      return () => {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }, []);

    // Drag-to-scroll handlers for desktop
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
      // Only start drag-to-scroll if clicking directly on the scroll container or floor area background
      const target = e.target as HTMLElement;
      const isFloorArea = target.classList.contains('floor-area-bg') || target === scrollContainerRef.current;
      if (!isFloorArea) return;

      isDraggingToScroll.current = true;
      startX.current = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
      scrollLeft.current = scrollContainerRef.current?.scrollLeft || 0;
      lastMouseX.current = e.pageX;

      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = 'grabbing';
        scrollContainerRef.current.style.userSelect = 'none';
      }
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
      if (!isDraggingToScroll.current || !scrollContainerRef.current) return;

      // Store the latest mouse position
      lastMouseX.current = e.pageX;

      // Use requestAnimationFrame for smooth scrolling
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          if (scrollContainerRef.current && isDraggingToScroll.current) {
            const x = lastMouseX.current - (scrollContainerRef.current.offsetLeft || 0);
            const walk = (x - startX.current) * 1.5; // Scroll speed multiplier
            scrollContainerRef.current.scrollLeft = scrollLeft.current - walk;
          }
          rafId.current = null;
        });
      }
    }, []);

    const handleMouseUp = useCallback(() => {
      isDraggingToScroll.current = false;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = '';
        scrollContainerRef.current.style.userSelect = '';
      }
    }, []);

    const handleMouseLeave = useCallback(() => {
      isDraggingToScroll.current = false;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = '';
        scrollContainerRef.current.style.userSelect = '';
      }
    }, []);

    return (
      <div className={cn("relative", isFullscreen && "h-full w-full")}>
        {/* Fullscreen button - fixed position outside scroll area */}
        {fullscreenButton && (
          <div className="absolute top-2 start-2 z-50">
            {fullscreenButton}
          </div>
        )}

        <div
          ref={scrollContainerRef}
          className={cn(
            "overflow-x-auto overflow-y-hidden",
            isFullscreen && "h-full w-full overflow-auto"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div
            ref={combinedRef}
            className={cn(
              "floor-area-bg relative border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg",
              "bg-zinc-100 dark:bg-zinc-800", // Light neutral gray background
              isOver && "border-primary bg-zinc-200 dark:bg-zinc-700",
              !isFullscreen && "mx-auto"
            )}
            style={{
              width: width,
              height: height,
              minHeight: height,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);

export function TableFloorPlan({
  tables,
  venueBlocks = [],
  eventId,
  onAssignGuests,
  onEditTable,
}: TableFloorPlanProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [localPositions, setLocalPositions] = useState<Map<string, LocalPosition>>(new Map());
  const [blockPositions, setBlockPositions] = useState<Map<string, LocalPosition>>(new Map());
  const [tableSizes, setTableSizes] = useState<Map<string, LocalSize>>(new Map());
  const [blockSizes, setBlockSizes] = useState<Map<string, LocalSize>>(new Map());
  const [tableRotations, setTableRotations] = useState<Map<string, number>>(new Map());
  const [blockRotations, setBlockRotations] = useState<Map<string, number>>(new Map());
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [floorWidth, setFloorWidth] = useState(DEFAULT_FLOOR_WIDTH);
  const [floorHeight, setFloorHeight] = useState(DEFAULT_FLOOR_HEIGHT);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [widthInputValue, setWidthInputValue] = useState(DEFAULT_FLOOR_WIDTH.toString());
  const [heightInputValue, setHeightInputValue] = useState(DEFAULT_FLOOR_HEIGHT.toString());
  const containerRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  // Store base dimensions (non-fullscreen) for proper position saving
  const baseFloorDimensions = useRef({ width: DEFAULT_FLOOR_WIDTH, height: DEFAULT_FLOOR_HEIGHT });

  // Chair assignment dialog state
  const [chairDialogOpen, setChairDialogOpen] = useState(false);
  const [selectedChair, setSelectedChair] = useState<{ tableId: string; tableName: string; chairIndex: number } | null>(null);
  const [selectedChairGuest, setSelectedChairGuest] = useState<ChairGuest | null>(null);
  const [allGuests, setAllGuests] = useState<Array<{ id: string; name: string; rsvpStatus?: string }>>([]);

  // Fetch all guests for the event
  useEffect(() => {
    async function fetchGuests() {
      const result = await getGuestsForAssignment(eventId);
      if (result.guests) {
        setAllGuests(result.guests.map(g => ({
          id: g.id,
          name: g.name,
          rsvpStatus: g.rsvp?.status || "PENDING",
        })));
      }
    }
    fetchGuests();

    // Refresh guests when seating data changes
    const handleRefresh = () => fetchGuests();
    window.addEventListener("seating-data-changed", handleRefresh);
    return () => window.removeEventListener("seating-data-changed", handleRefresh);
  }, [eventId]);

  // Handle chair click - open assignment dialog
  const handleChairClick = useCallback((tableId: string, tableName: string, chairIndex: number, guest: ChairGuest | null) => {
    setSelectedChair({ tableId, tableName, chairIndex });
    setSelectedChairGuest(guest);
    setChairDialogOpen(true);
  }, []);

  // Available guests - all guests excluding those already assigned to any table
  const assignedGuestIds = new Set(
    tables.flatMap(t => t.assignments.map(a => a.guest.id))
  );
  const availableGuests = allGuests.filter(g => !assignedGuestIds.has(g.id));

  // Handle assign guest to table
  const handleAssignGuest = async (guestId: string) => {
    if (!selectedChair) return;

    const result = await assignGuestsToTable({ tableId: selectedChair.tableId, guestIds: [guestId] });
    if (result.error) {
      toast.error(result.error);
    } else {
      // Refresh data
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    }
  };

  // Handle replace guest on table (remove old, add new)
  const handleReplaceGuest = async (oldGuestId: string, newGuestId: string) => {
    if (!selectedChair) return;

    // First remove the old guest
    const removeResult = await removeGuestFromTable({ guestId: oldGuestId });
    if (removeResult.error) {
      toast.error(removeResult.error);
      return;
    }

    // Then add the new guest
    const assignResult = await assignGuestsToTable({ tableId: selectedChair.tableId, guestIds: [newGuestId] });
    if (assignResult.error) {
      toast.error(assignResult.error);
    } else {
      // Refresh data
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    }
  };

  // Handle unassign guest from table
  const handleUnassignGuest = async (guestId: string) => {
    const result = await removeGuestFromTable({ guestId });
    if (result.error) {
      toast.error(result.error);
    } else {
      // Refresh data
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    }
  };

  // Auto-arrange tables that don't have positions
  const getAutoPosition = useCallback((index: number) => {
    const cols = 5;
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      x: 20 + col * 100,
      y: 20 + row * 100,
    };
  }, []);

  // Get current position for a table (local > saved > auto)
  const getTablePosition = useCallback((table: Table, index: number): LocalPosition => {
    const local = localPositions.get(table.id);
    if (local) return local;
    if (table.positionX != null && table.positionY != null) {
      return { x: table.positionX, y: table.positionY };
    }
    return getAutoPosition(index);
  }, [localPositions, getAutoPosition]);

  // Get current position for a block (local > saved > default)
  const getBlockPosition = useCallback((block: VenueBlock, index: number): LocalPosition => {
    const local = blockPositions.get(block.id);
    if (local) return local;
    if (block.positionX != null && block.positionY != null) {
      return { x: block.positionX, y: block.positionY };
    }
    // Auto position blocks along the bottom
    return {
      x: 50 + index * 120,
      y: floorHeight - block.height - 50,
    };
  }, [blockPositions, floorHeight]);

  // Load floor dimensions from database on mount or when eventId changes
  useEffect(() => {
    async function loadDimensions() {
      const result = await getCanvasDimensions(eventId);
      if (result.success && result.width && result.height) {
        setFloorWidth(result.width);
        setWidthInputValue(result.width.toString());
        baseFloorDimensions.current.width = result.width;

        setFloorHeight(result.height);
        setHeightInputValue(result.height.toString());
        baseFloorDimensions.current.height = result.height;
      } else {
        // Use defaults if no saved value
        setFloorWidth(DEFAULT_FLOOR_WIDTH);
        setWidthInputValue(DEFAULT_FLOOR_WIDTH.toString());
        baseFloorDimensions.current.width = DEFAULT_FLOOR_WIDTH;

        setFloorHeight(DEFAULT_FLOOR_HEIGHT);
        setHeightInputValue(DEFAULT_FLOOR_HEIGHT.toString());
        baseFloorDimensions.current.height = DEFAULT_FLOOR_HEIGHT;
      }
    }
    loadDimensions();
  }, [eventId]);

  // Update base dimensions when dimensions change
  useEffect(() => {
    if (!isFullscreen) {
      baseFloorDimensions.current = {
        width: floorWidth,
        height: floorHeight,
      };
    }
  }, [isFullscreen, floorWidth, floorHeight]);

  // Handle fullscreen mode with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Handle canvas height change with proportional scaling
  const handleHeightChange = useCallback((newHeight: number) => {
    const oldHeight = floorHeight;
    const height = Math.max(MIN_FLOOR_HEIGHT, Math.min(MAX_FLOOR_HEIGHT, newHeight));

    // Calculate scale factor
    const scaleY = height / oldHeight;

    // Scale all table positions proportionally
    if (scaleY !== 1 && tables.length > 0) {
      const updatedTablePositions = new Map(localPositions);

      tables.forEach((table, index) => {
        const currentPos = getTablePosition(table, index);
        const scaledY = currentPos.y * scaleY;

        // Ensure within bounds
        const shape = (table.shape || "circle") as keyof typeof DEFAULT_TABLE_SIZE;
        const defaultSize = DEFAULT_TABLE_SIZE[shape] || DEFAULT_TABLE_SIZE.circle;
        const localTableSize = tableSizes.get(table.id);
        const tableHeight = localTableSize?.height ?? table.height ?? defaultSize.height;
        const maxY = Math.max(0, height - tableHeight);
        const boundedY = Math.max(0, Math.min(scaledY, maxY));

        updatedTablePositions.set(table.id, {
          x: currentPos.x,
          y: boundedY,
        });
      });

      setLocalPositions(updatedTablePositions);

      // Scale venue block positions
      const updatedBlockPositions = new Map(blockPositions);

      venueBlocks.forEach((block, index) => {
        const currentPos = getBlockPosition(block, index);
        const scaledY = currentPos.y * scaleY;

        // Ensure within bounds
        const maxY = Math.max(0, height - block.height);
        const boundedY = Math.max(0, Math.min(scaledY, maxY));

        updatedBlockPositions.set(block.id, {
          x: currentPos.x,
          y: boundedY,
        });
      });

      setBlockPositions(updatedBlockPositions);
    }

    setFloorHeight(height);
    setHeightInputValue(height.toString());
    baseFloorDimensions.current.height = height;

    // Save to database (debounced via the effect below)
  }, [floorHeight, tables, venueBlocks, localPositions, blockPositions, tableSizes, getTablePosition, getBlockPosition]);

  // Handle input field change for height
  const handleHeightInputChange = useCallback((value: string) => {
    setHeightInputValue(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      handleHeightChange(parsed);
    }
  }, [handleHeightChange]);

  // Handle canvas width change with proportional scaling
  const handleWidthChange = useCallback((newWidth: number) => {
    const oldWidth = floorWidth;
    const width = Math.max(MIN_FLOOR_WIDTH, Math.min(MAX_FLOOR_WIDTH, newWidth));

    // Calculate scale factor
    const scaleX = width / oldWidth;

    // Scale all table positions proportionally
    if (scaleX !== 1 && tables.length > 0) {
      const updatedTablePositions = new Map(localPositions);

      tables.forEach((table, index) => {
        const currentPos = getTablePosition(table, index);
        const scaledX = currentPos.x * scaleX;

        // Ensure within bounds
        const shape = (table.shape || "circle") as keyof typeof DEFAULT_TABLE_SIZE;
        const defaultSize = DEFAULT_TABLE_SIZE[shape] || DEFAULT_TABLE_SIZE.circle;
        const localTableSize = tableSizes.get(table.id);
        const tableWidth = localTableSize?.width ?? table.width ?? defaultSize.width;
        const maxX = Math.max(0, width - tableWidth);
        const boundedX = Math.max(0, Math.min(scaledX, maxX));

        updatedTablePositions.set(table.id, {
          x: boundedX,
          y: currentPos.y,
        });
      });

      setLocalPositions(updatedTablePositions);

      // Scale venue block positions
      const updatedBlockPositions = new Map(blockPositions);

      venueBlocks.forEach((block, index) => {
        const currentPos = getBlockPosition(block, index);
        const scaledX = currentPos.x * scaleX;

        // Ensure within bounds
        const maxX = Math.max(0, width - block.width);
        const boundedX = Math.max(0, Math.min(scaledX, maxX));

        updatedBlockPositions.set(block.id, {
          x: boundedX,
          y: currentPos.y,
        });
      });

      setBlockPositions(updatedBlockPositions);
    }

    setFloorWidth(width);
    setWidthInputValue(width.toString());
    // Update base dimensions
    baseFloorDimensions.current = {
      width,
      height: floorHeight,
    };

    // Save to database (debounced via the effect below)
  }, [floorWidth, floorHeight, tables, venueBlocks, localPositions, blockPositions, tableSizes, getTablePosition, getBlockPosition]);

  // Handle input field change for width
  const handleWidthInputChange = useCallback((value: string) => {
    setWidthInputValue(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      handleWidthChange(parsed);
    }
  }, [handleWidthChange]);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      if (prev) {
        // Exiting fullscreen - restore saved dimensions from baseFloorDimensions
        setFloorWidth(baseFloorDimensions.current.width);
        setFloorHeight(baseFloorDimensions.current.height);
      }
      return !prev;
    });
  }, []);

  // Debounced save to database when dimensions change
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Skip initial render and fullscreen mode
    if (isFullscreen) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save - wait 1 second after last change
    saveTimeoutRef.current = setTimeout(async () => {
      await updateCanvasDimensions(eventId, floorWidth, floorHeight);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [eventId, floorWidth, floorHeight, isFullscreen]);

  const hasUnsavedChanges = localPositions.size > 0 || blockPositions.size > 0 || tableSizes.size > 0 || blockSizes.size > 0 || tableRotations.size > 0 || blockRotations.size > 0;
  const totalUnsavedCount = localPositions.size + blockPositions.size + tableSizes.size + blockSizes.size + tableRotations.size + blockRotations.size;

  // Combined activation: instant on move OR hold to activate
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // Drag activates with 1px movement (instant feel)
        delay: 100, // OR drag activates after 150ms hold
        tolerance: 5, // Allow 5px jitter during hold
      },
    })
  );

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);

    const { active, delta } = event;
    const activeId = active.id as string;

    if (delta.x === 0 && delta.y === 0) return;

    // Check if it's a venue block
    if (activeId.startsWith("block-")) {
      const blockId = activeId.replace("block-", "");
      const blockIndex = venueBlocks.findIndex((b) => b.id === blockId);
      const block = venueBlocks[blockIndex];

      if (!block) return;

      const currentPos = getBlockPosition(block, blockIndex);

      // Calculate new position (no grid snapping)
      const newX = currentPos.x + delta.x;
      const newY = currentPos.y + delta.y;

      // Ensure within bounds (allow positioning at edges)
      const maxX = Math.max(0, floorWidth - block.width);
      const maxY = Math.max(0, floorHeight - block.height);
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      setBlockPositions((prev) => {
        const next = new Map(prev);
        next.set(blockId, { x: boundedX, y: boundedY });
        return next;
      });
    } else {
      // It's a table
      const tableIndex = tables.findIndex((t) => t.id === activeId);
      const table = tables[tableIndex];

      if (!table) return;

      // Get current position (local or saved)
      const currentPos = getTablePosition(table, tableIndex);

      // Get table dimensions to ensure it stays fully visible
      const shape = (table.shape || "circle") as keyof typeof DEFAULT_TABLE_SIZE;
      const defaultSize = DEFAULT_TABLE_SIZE[shape] || DEFAULT_TABLE_SIZE.circle;
      const localTableSize = tableSizes.get(table.id);
      const tableWidth = localTableSize?.width ?? table.width ?? defaultSize.width;
      const tableHeight = localTableSize?.height ?? table.height ?? defaultSize.height;

      // Calculate new position (no grid snapping)
      const newX = currentPos.x + delta.x;
      const newY = currentPos.y + delta.y;

      // Ensure within bounds (allow positioning at edges)
      const maxX = Math.max(0, floorWidth - tableWidth);
      const maxY = Math.max(0, floorHeight - tableHeight);
      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(0, Math.min(newY, maxY));

      // Update local state only (no server call)
      setLocalPositions((prev) => {
        const next = new Map(prev);
        next.set(activeId, { x: boundedX, y: boundedY });
        return next;
      });
    }
  };

  const handleSavePositions = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      // When in fullscreen, scale positions to base dimensions for saving
      const scaleX = isFullscreen ? baseFloorDimensions.current.width / floorWidth : 1;
      const scaleY = isFullscreen ? baseFloorDimensions.current.height / floorHeight : 1;

      // Get current table and block IDs to filter out deleted items
      const existingTableIds = new Set(tables.map((t) => t.id));
      const existingBlockIds = new Set(venueBlocks.map((b) => b.id));

      // Save all table positions (scaled if in fullscreen) - filter out deleted tables
      const tablePositionPromises = Array.from(localPositions.entries())
        .filter(([tableId]) => existingTableIds.has(tableId))
        .map(([tableId, pos]) =>
          updateTablePosition({
            id: tableId,
            positionX: Math.round(pos.x * scaleX),
            positionY: Math.round(pos.y * scaleY),
          })
        );

      // Save all block positions (scaled if in fullscreen) - filter out deleted blocks
      const blockPositionPromises = Array.from(blockPositions.entries())
        .filter(([blockId]) => existingBlockIds.has(blockId))
        .map(([blockId, pos]) =>
          updateVenueBlockPosition({
            id: blockId,
            positionX: Math.round(pos.x * scaleX),
            positionY: Math.round(pos.y * scaleY),
          })
        );

      // Save all table sizes (rounded to integers) - filter out deleted tables
      const tableSizePromises = Array.from(tableSizes.entries())
        .filter(([tableId]) => existingTableIds.has(tableId))
        .map(([tableId, size]) =>
          updateTableSize({
            id: tableId,
            width: Math.round(size.width),
            height: Math.round(size.height),
          })
        );

      // Save all block sizes (rounded to integers) - filter out deleted blocks
      const blockSizePromises = Array.from(blockSizes.entries())
        .filter(([blockId]) => existingBlockIds.has(blockId))
        .map(([blockId, size]) =>
          updateVenueBlockSize({
            id: blockId,
            width: Math.round(size.width),
            height: Math.round(size.height),
          })
        );

      // Save all table rotations - filter out deleted tables
      const tableRotationPromises = Array.from(tableRotations.entries())
        .filter(([tableId]) => existingTableIds.has(tableId))
        .map(([tableId, rotation]) =>
          updateTableRotation({
            id: tableId,
            rotation,
          })
        );

      // Save all block rotations - filter out deleted blocks
      const blockRotationPromises = Array.from(blockRotations.entries())
        .filter(([blockId]) => existingBlockIds.has(blockId))
        .map(([blockId, rotation]) =>
          updateVenueBlockRotation({
            id: blockId,
            rotation,
          })
        );

      const results = await Promise.all([
        ...tablePositionPromises,
        ...blockPositionPromises,
        ...tableSizePromises,
        ...blockSizePromises,
        ...tableRotationPromises,
        ...blockRotationPromises,
      ]);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        console.error("Save position errors:", errors.map((e) => e.error));
        toast.error(t("savePositionError"));
      } else {
        toast.success(t("positionsSaved"));

        // Build the updated positions data to pass to parent for optimistic updates
        const updatedPositions = {
          tables: Object.fromEntries(
            Array.from(localPositions.entries()).map(([tableId, pos]) => [
              tableId,
              { x: Math.round(pos.x * scaleX), y: Math.round(pos.y * scaleY) },
            ])
          ),
          blocks: Object.fromEntries(
            Array.from(blockPositions.entries()).map(([blockId, pos]) => [
              blockId,
              { x: Math.round(pos.x * scaleX), y: Math.round(pos.y * scaleY) },
            ])
          ),
          tableSizes: Object.fromEntries(
            Array.from(tableSizes.entries()).map(([tableId, size]) => [
              tableId,
              { width: Math.round(size.width), height: Math.round(size.height) },
            ])
          ),
          blockSizes: Object.fromEntries(
            Array.from(blockSizes.entries()).map(([blockId, size]) => [
              blockId,
              { width: Math.round(size.width), height: Math.round(size.height) },
            ])
          ),
          tableRotations: Object.fromEntries(tableRotations.entries()),
          blockRotations: Object.fromEntries(blockRotations.entries()),
        };

        // Clear local state
        setLocalPositions(new Map());
        setBlockPositions(new Map());
        setTableSizes(new Map());
        setBlockSizes(new Map());
        setTableRotations(new Map());
        setBlockRotations(new Map());

        // Trigger optimistic refresh
        window.dispatchEvent(new CustomEvent("seating-data-changed", {
          detail: {
            type: "positions-saved",
            updatedPositions,
          },
        }));
      }
    } catch (err) {
      console.error("Save position exception:", err);
      toast.error(t("savePositionError"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setLocalPositions(new Map());
    setBlockPositions(new Map());
    setTableSizes(new Map());
    setBlockSizes(new Map());
    setTableRotations(new Map());
    setBlockRotations(new Map());
    toast.info(t("changesDiscarded"));
  };

  const handleConfirmDiscard = () => {
    setLocalPositions(new Map());
    setBlockPositions(new Map());
    setTableSizes(new Map());
    setBlockSizes(new Map());
    setTableRotations(new Map());
    setBlockRotations(new Map());
    setShowUnsavedDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Resize handlers
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
  }, []);

  const handleResize = useCallback((
    id: string,
    type: "table" | "block",
    width: number,
    height: number
  ) => {
    if (type === "table") {
      setTableSizes((prev) => {
        const next = new Map(prev);
        next.set(id, { width, height });
        return next;
      });
    } else {
      setBlockSizes((prev) => {
        const next = new Map(prev);
        next.set(id, { width, height });
        return next;
      });
    }
  }, []);

  const handleResizeEnd = useCallback((id: string, type: "table" | "block") => {
    setIsResizing(false);
    // No grid snapping - sizes are already set by handleResize
  }, []);

  // Rotation handler - increments by 45 degrees
  const handleRotate = useCallback((id: string, type: "table" | "block") => {
    if (type === "table") {
      setTableRotations((prev) => {
        const next = new Map(prev);
        const table = tables.find((t) => t.id === id);
        const currentRotation = prev.get(id) ?? table?.rotation ?? 0;
        const newRotation = (currentRotation + 45) % 360;
        next.set(id, newRotation);
        return next;
      });
    } else {
      setBlockRotations((prev) => {
        const next = new Map(prev);
        const block = venueBlocks.find((b) => b.id === id);
        const currentRotation = prev.get(id) ?? block?.rotation ?? 0;
        const newRotation = (currentRotation + 45) % 360;
        next.set(id, newRotation);
        return next;
      });
    }
  }, [tables, venueBlocks]);

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const result = await deleteVenueBlock(blockId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("venueBlocks.blockDeleted"));
        // Remove from local positions if it was moved
        setBlockPositions((prev) => {
          const next = new Map(prev);
          next.delete(blockId);
          return next;
        });
        // Refresh data
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
      toast.error(t("venueBlocks.deleteError"));
    }
  };

  // Check if any tables have no position set
  const tablesNeedingPosition = tables.filter(
    (t) => t.positionX === null || t.positionY === null
  );

  // Fullscreen toggle button - rendered outside scroll area
  const fullscreenButton = (
    <Button
      variant="outline"
      size="icon"
      className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
      onClick={toggleFullscreen}
      title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
    >
      {isFullscreen ? (
        <Minimize2 className="h-4 w-4" />
      ) : (
        <Maximize2 className="h-4 w-4" />
      )}
    </Button>
  );

  // Floor plan content - reused in both normal and fullscreen modes
  const floorPlanContent = (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <FloorArea ref={floorRef} width={floorWidth} height={floorHeight} isFullscreen={isFullscreen} fullscreenButton={fullscreenButton}>
        {tables.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Icons.layoutGrid className="h-12 w-12 mb-4" />
            <p>{t("noTablesYet")}</p>
            <p className="text-sm">{t("addTableToStart")}</p>
          </div>
        ) : (
          tables.map((table, index) => {
            const position = getTablePosition(table, index);
            const tableWithPosition = {
              ...table,
              positionX: position.x,
              positionY: position.y,
            };

            return (
              <DraggableTable
                key={table.id}
                table={tableWithPosition}
                localPosition={localPositions.get(table.id)}
                localSize={tableSizes.get(table.id)}
                localRotation={tableRotations.get(table.id)}
                onAssignGuests={onAssignGuests}
                onEditTable={onEditTable}
                onResizeStart={handleResizeStart}
                onResize={handleResize}
                onResizeEnd={handleResizeEnd}
                onRotate={handleRotate}
                isResizing={isResizing}
                onChairClick={handleChairClick}
              />
            );
          })
        )}

        {/* Venue Blocks */}
        {venueBlocks.map((block, index) => {
          const position = getBlockPosition(block, index);
          const blockWithPosition = {
            ...block,
            positionX: position.x,
            positionY: position.y,
          };

          return (
            <DraggableVenueBlock
              key={block.id}
              block={blockWithPosition}
              localPosition={blockPositions.get(block.id)}
              localSize={blockSizes.get(block.id)}
              localRotation={blockRotations.get(block.id)}
              onDelete={handleDeleteBlock}
              onResizeStart={handleResizeStart}
              onResize={handleResize}
              onResizeEnd={handleResizeEnd}
              onRotate={handleRotate}
              isResizing={isResizing}
            />
          );
        })}

        {/* Drag indicator */}
        {activeDragId && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium shadow-lg">
            {t("dropToPosition")}
          </div>
        )}
      </FloorArea>

      {/* Drag Overlay - shows the dragged item */}
      <DragOverlay dropAnimation={null}>
        {activeDragId ? (
          activeDragId.startsWith("block-") ? (
            (() => {
              const blockId = activeDragId.replace("block-", "");
              const block = venueBlocks.find((b) => b.id === blockId);
              if (!block) return null;

              const size = blockSizes.get(block.id) || { width: block.width || 100, height: block.height || 100 };
              const rotation = blockRotations.get(block.id) ?? block.rotation ?? 0;

              const IconComponent = Icons[VENUE_BLOCK_ICONS[block.type] || "box"];
              const colorClasses = VENUE_BLOCK_COLORS[block.type] || VENUE_BLOCK_COLORS.other;
              const shapeClass = VENUE_BLOCK_SHAPE_CLASSES[block.shape || "rectangle"] || VENUE_BLOCK_SHAPE_CLASSES.rectangle;

              return (
                <div
                  className={cn(
                    "flex flex-col items-center justify-center shadow-lg cursor-grabbing border-2",
                    colorClasses,
                    shapeClass
                  )}
                  style={{
                    width: size.width,
                    height: size.height,
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  <IconComponent className="h-6 w-6 text-muted-foreground pointer-events-none z-10" />
                  <span className="text-xs font-medium text-center truncate max-w-[90%] mt-1 pointer-events-none z-10">
                    {block.name}
                  </span>
                </div>
              );
            })()
          ) : (
            (() => {
              const table = tables.find((t) => t.id === activeDragId);
              if (!table) return null;

              const size = tableSizes.get(table.id) || { width: table.width || 100, height: table.height || 100 };
              const rotation = tableRotations.get(table.id) ?? table.rotation ?? 0;

              // Convert assignments to format for TableWithSeats
              const dragAssignments: ChairGuest[] = table.assignments.map((assignment) => ({
                id: assignment.guest.id,
                name: assignment.guest.name,
                rsvpStatus: (assignment.guest.rsvp?.status as ChairGuest['rsvpStatus']) || "PENDING",
                guestCount: assignment.guest.rsvp?.guestCount || assignment.guest.expectedGuests || 1,
              }));

              return (
                <div
                  className="cursor-grabbing"
                  style={{
                    width: size.width,
                    height: size.height,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      transform: `rotate(${rotation}deg)`,
                    }}
                  >
                    <TableWithSeats
                      table={{
                        id: table.id,
                        name: table.name,
                        capacity: table.capacity,
                        shape: table.shape || "circle",
                        seatingArrangement: table.seatingArrangement || "even",
                        colorTheme: (table.colorTheme as TableColorTheme) || "default",
                        width: size.width,
                        height: size.height,
                        rotation: 0,
                      }}
                      assignments={dragAssignments}
                      positionX={0}
                      positionY={0}
                    />
                  </div>
                </div>
              );
            })()
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div
        ref={fullscreenRef}
        className="fixed inset-0 z-[100] bg-background flex flex-col"
      >
        {/* Fullscreen header */}
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-none border-2 border-primary/50 bg-card" />
              <span>{t("shapes.square")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-card" />
              <span>{t("shapes.circle")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-3 rounded-none border-2 border-primary/50 bg-card" />
              <span>{t("shapes.rectangle")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-3 rounded-[50%] border-2 border-primary/50 bg-card" />
              <span>{t("shapes.oval")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <>
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  {t("unsavedChanges", { count: totalUnsavedCount })}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscardChanges}
                  disabled={isSaving}
                >
                  <Icons.close className="me-2 h-4 w-4" />
                  {tc("discard")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePositions}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.check className="me-2 h-4 w-4" />
                  )}
                  {tc("save")}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              <Minimize2 className="me-2 h-4 w-4" />
              {t("exitFullscreen")}
            </Button>
          </div>
        </div>

        {/* Fullscreen floor plan */}
        <div className="flex-1 p-4 overflow-hidden">
          {floorPlanContent}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Header with Save/Discard buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-none border-2 border-primary/50 bg-card" />
            <span>{t("shapes.square")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-card" />
            <span>{t("shapes.circle")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 rounded-none border-2 border-primary/50 bg-card" />
            <span>{t("shapes.rectangle")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 rounded-[50%] border-2 border-primary/50 bg-card" />
            <span>{t("shapes.oval")}</span>
          </div>
          <div className="flex items-center gap-2 ms-4">
            <Icons.arrowRight className="h-4 w-4" />
            <span>{t("dragToReposition")}</span>
          </div>
        </div>

        {/* Save/Discard buttons */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              {t("unsavedChanges", { count: totalUnsavedCount })}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={isSaving}
            >
              <Icons.close className="me-2 h-4 w-4" />
              {tc("discard")}
            </Button>
            <Button
              size="sm"
              onClick={handleSavePositions}
              disabled={isSaving}
            >
              {isSaving ? (
                <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.check className="me-2 h-4 w-4" />
              )}
              {tc("save")}
            </Button>
          </div>
        )}
      </div>

      {/* Warning for tables without positions */}
      {tablesNeedingPosition.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm">
          <Icons.alertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("tablesNeedPositioning", { count: tablesNeedingPosition.length })}
          </span>
        </div>
      )}

      {/* Floor Plan */}
      {floorPlanContent}

      {/* Canvas Size Controls */}
      <div className="flex flex-col gap-3 p-3 bg-muted/30 rounded-lg border">
        {/* Width Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("canvasWidth")}:</span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={widthInputValue}
              onChange={(e) => handleWidthInputChange(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(widthInputValue, 10);
                if (isNaN(parsed) || parsed < MIN_FLOOR_WIDTH) {
                  handleWidthChange(MIN_FLOOR_WIDTH);
                } else if (parsed > MAX_FLOOR_WIDTH) {
                  handleWidthChange(MAX_FLOOR_WIDTH);
                }
              }}
              className="w-24 h-8"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWidthChange(800)}
              className={cn("h-7", floorWidth === 800 && "bg-accent")}
            >
              800
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleWidthChange(1200)}
              className={cn("h-7", floorWidth === 1200 && "bg-accent")}
            >
              1200
            </Button>
          </div>
        </div>

        {/* Height Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{t("canvasHeight")}:</span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={heightInputValue}
              onChange={(e) => handleHeightInputChange(e.target.value)}
              onBlur={() => {
                const parsed = parseInt(heightInputValue, 10);
                if (isNaN(parsed) || parsed < MIN_FLOOR_HEIGHT) {
                  handleHeightChange(MIN_FLOOR_HEIGHT);
                } else if (parsed > MAX_FLOOR_HEIGHT) {
                  handleHeightChange(MAX_FLOOR_HEIGHT);
                }
              }}
              className="w-24 h-8"
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleHeightChange(800)}
              className={cn("h-7", floorHeight === 800 && "bg-accent")}
            >
              800
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleHeightChange(1200)}
              className={cn("h-7", floorHeight === 1200 && "bg-accent")}
            >
              1200
            </Button>
          </div>
        </div>
      </div>

      {/* Chair Assignment Dialog */}
      {selectedChair && (
        <ManageTableGuestDialog
          open={chairDialogOpen}
          onOpenChange={setChairDialogOpen}
          tableId={selectedChair.tableId}
          tableName={selectedChair.tableName}
          chairIndex={selectedChair.chairIndex}
          currentGuest={selectedChairGuest}
          availableGuests={availableGuests}
          onAssign={handleAssignGuest}
          onReplace={handleReplaceGuest}
          onUnassign={handleUnassignGuest}
        />
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsavedChangesTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("unsavedChangesDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>
              {tc("discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
