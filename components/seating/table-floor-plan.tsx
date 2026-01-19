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

import { updateTablePosition, updateTableSize, updateTableRotation, updateVenueBlockPosition, updateVenueBlockSize, updateVenueBlockRotation, deleteVenueBlock, deleteTable } from "@/actions/seating";
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
import { AssignSeatDialog } from "@/components/seating/assign-seat-dialog";
import { assignGuestToSeat, unassignSeat, getGuestsForAssignment } from "@/actions/seating";

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
  seats?: TableSeat[];
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
const DEFAULT_FLOOR_HEIGHT = 600; // Default floor height
const MIN_FLOOR_HEIGHT = 300;
const MAX_FLOOR_HEIGHT = 3000; // Allow very large floor plans
const FLOOR_HEIGHT_STORAGE_KEY = "seating-floor-height";
const MIN_SIZE = 40;
const MAX_SIZE = 400;
const DEFAULT_TABLE_SIZE = {
  circle: { width: 100, height: 100 },
  rectangle: { width: 140, height: 80 },
  rectangleRounded: { width: 140, height: 80 },
  concave: { width: 140, height: 80 },
  concaveRounded: { width: 140, height: 80 },
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
  onSeatClick,
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
  onSeatClick?: (seatId: string, seatNumber: number, tableName: string, currentGuest?: TableSeat['guest']) => void;
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
        // Refresh data
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
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
  const isConcave = shape === "concave" || shape === "concaveRounded";
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
    circle: "rounded-full",
    rectangle: "rounded-none",
    rectangleRounded: "rounded-lg",
    concave: "rounded-t-full rounded-b-none",
    concaveRounded: "rounded-t-full rounded-b-lg",
  };


  // Prepare seats data for TableWithSeats component
  const tableSeats = (table.seats || []).map((seat) => ({
    id: seat.id,
    seatNumber: seat.seatNumber,
    relativeX: seat.relativeX,
    relativeY: seat.relativeY,
    angle: seat.angle,
    guest: seat.guest ? {
      id: seat.guest.id,
      name: seat.guest.name,
      rsvpStatus: seat.guest.rsvpStatus || "PENDING",
    } : null,
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
            }}
          >
            <TableWithSeats
              table={{
                id: table.id,
                name: table.name,
                capacity: table.capacity,
                shape: shape,
                colorTheme: (table.colorTheme as TableColorTheme) || "default",
                width,
                height,
                rotation: 0, // Rotation is handled by parent div
              }}
              seats={tableSeats}
              positionX={0}
              positionY={0}
              onSeatClick={(seatId, seatNumber) => {
                const seat = table.seats?.find(s => s.id === seatId);
                onSeatClick?.(seatId, seatNumber, table.name, seat?.guest);
              }}
              onTableClick={() => setPopoverOpen(true)}
            />
          </div>

          {/* Rotation button - only for non-circle shapes */}
          {!isCircle && (
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
  circle: "rounded-full",
  rectangle: "rounded-none",
  rectangleRounded: "rounded-lg",
  concave: "rounded-t-full rounded-b-none",
  concaveRounded: "rounded-t-full rounded-b-lg",
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
  const shapeClass = VENUE_BLOCK_SHAPE_CLASSES[block.shape || "rectangleRounded"] || VENUE_BLOCK_SHAPE_CLASSES.rectangleRounded;
  const isCircle = block.shape === "circle";
  const isConcave = block.shape === "concave" || block.shape === "concaveRounded";

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
              "flex flex-col items-center justify-center shadow-sm transition-shadow group",
              !isResizing && "cursor-grab active:cursor-grabbing",
              !isConcave && "border-2",
              !isConcave && colorClasses,
              !isConcave && shapeClass,
              isDragging && "shadow-lg"
            )}
          >
            {/* Concave shape SVG */}
            {isConcave && (
              <ConcaveShape
                width={width}
                height={height}
                rounded={block.shape === "concaveRounded"}
                borderColor={blockBorderColor}
              />
            )}
            <IconComponent className="h-6 w-6 text-muted-foreground pointer-events-none z-10" />
            <span className="text-xs font-medium text-center truncate max-w-[90%] mt-1 pointer-events-none z-10">
              {block.name}
            </span>

            {/* Rotation button - only for non-circle shapes */}
            {!isCircle && (
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

const FloorArea = React.forwardRef<HTMLDivElement, { children: React.ReactNode; height: number; isFullscreen?: boolean }>(
  function FloorArea({ children, height, isFullscreen }, ref) {
    const { setNodeRef, isOver } = useDroppable({
      id: "floor-area",
    });

    // Combine refs for both droppable and measurement
    const combinedRef = useCallback((node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref, setNodeRef]);

    return (
      <div
        ref={combinedRef}
        className={cn(
          "relative w-full border-2 border-dashed rounded-lg overflow-hidden",
          "bg-muted/30",
          isOver && "border-primary bg-primary/5",
          isFullscreen && "rounded-none border-0"
        )}
        style={{
          height: isFullscreen ? "100%" : height,
        }}
      >
        {children}
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
  const [floorWidth, setFloorWidth] = useState(800); // Default width, will be updated
  const [floorHeight, setFloorHeight] = useState(DEFAULT_FLOOR_HEIGHT);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [heightInputValue, setHeightInputValue] = useState(DEFAULT_FLOOR_HEIGHT.toString());
  const containerRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  // Store base dimensions (non-fullscreen) for proper position saving
  const baseFloorDimensions = useRef({ width: 800, height: DEFAULT_FLOOR_HEIGHT });

  // Seat assignment dialog state
  const [assignSeatDialogOpen, setAssignSeatDialogOpen] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<{ seatId: string; seatNumber: number; tableName: string } | null>(null);
  const [selectedSeatGuest, setSelectedSeatGuest] = useState<TableSeat['guest'] | null>(null);
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

  // Handle seat click - open assignment dialog
  const handleSeatClick = useCallback((seatId: string, seatNumber: number, tableName: string, currentGuest?: TableSeat['guest']) => {
    setSelectedSeat({ seatId, seatNumber, tableName });
    setSelectedSeatGuest(currentGuest || null);
    setAssignSeatDialogOpen(true);
  }, []);

  // Available guests - all guests excluding those already seated
  const seatedGuestIds = new Set(
    tables.flatMap(t => t.seats?.map(s => s.guest?.id).filter(Boolean) || [])
  );
  const availableGuests = allGuests.filter(g => !seatedGuestIds.has(g.id));

  // Handle assign guest to seat
  const handleAssignSeat = async (guestId: string) => {
    if (!selectedSeat) return;

    const result = await assignGuestToSeat(selectedSeat.seatId, guestId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t("guestAssignedToSeat"));
      // Refresh data
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    }
  };

  // Handle unassign seat
  const handleUnassignSeat = async () => {
    if (!selectedSeat) return;

    const result = await unassignSeat(selectedSeat.seatId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t("seatUnassigned"));
      // Refresh data
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    }
  };

  // Load floor height from localStorage on mount
  useEffect(() => {
    const savedHeight = localStorage.getItem(FLOOR_HEIGHT_STORAGE_KEY);
    if (savedHeight) {
      const height = parseInt(savedHeight, 10);
      if (!isNaN(height) && height >= MIN_FLOOR_HEIGHT && height <= MAX_FLOOR_HEIGHT) {
        setFloorHeight(height);
        setHeightInputValue(height.toString());
        // Also set base dimensions
        baseFloorDimensions.current.height = height;
      }
    }
  }, []);

  // Measure floor dimensions on mount, resize, and fullscreen change
  useEffect(() => {
    const updateFloorDimensions = () => {
      if (floorRef.current) {
        const currentWidth = floorRef.current.clientWidth;
        setFloorWidth(currentWidth);

        // In fullscreen mode, use actual element height
        if (isFullscreen) {
          setFloorHeight(floorRef.current.clientHeight);
        } else {
          // Update base dimensions when not in fullscreen
          baseFloorDimensions.current = {
            width: currentWidth,
            height: floorHeight,
          };
        }
      }
    };

    // Use requestAnimationFrame to ensure DOM has updated after fullscreen toggle
    const rafId = requestAnimationFrame(updateFloorDimensions);
    window.addEventListener("resize", updateFloorDimensions);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateFloorDimensions);
    };
  }, [isFullscreen, floorHeight]);

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
    localStorage.setItem(FLOOR_HEIGHT_STORAGE_KEY, height.toString());
    // Update base dimensions
    if (floorRef.current) {
      baseFloorDimensions.current = {
        width: floorRef.current.clientWidth,
        height,
      };
    }
  }, [floorHeight, tables, venueBlocks, localPositions, blockPositions, tableSizes]);

  // Handle input field change
  const handleHeightInputChange = useCallback((value: string) => {
    setHeightInputValue(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      handleHeightChange(parsed);
    }
  }, [handleHeightChange]);

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      if (prev) {
        // Exiting fullscreen - restore saved height
        const savedHeight = localStorage.getItem(FLOOR_HEIGHT_STORAGE_KEY);
        if (savedHeight) {
          const height = parseInt(savedHeight, 10);
          if (!isNaN(height) && height >= MIN_FLOOR_HEIGHT && height <= MAX_FLOOR_HEIGHT) {
            setFloorHeight(height);
          }
        } else {
          setFloorHeight(DEFAULT_FLOOR_HEIGHT);
        }
      }
      return !prev;
    });
  }, []);

  const hasUnsavedChanges = localPositions.size > 0 || blockPositions.size > 0 || tableSizes.size > 0 || blockSizes.size > 0 || tableRotations.size > 0 || blockRotations.size > 0;
  const totalUnsavedCount = localPositions.size + blockPositions.size + tableSizes.size + blockSizes.size + tableRotations.size + blockRotations.size;

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

  // Configure sensors with distance activation - drag starts after moving 3px
  // This allows clicks to pass through for the popover while being responsive
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  // Auto-arrange tables that don't have positions
  const getAutoPosition = useCallback((index: number) => {
    const cols = 4;
    const row = Math.floor(index / cols);
    const col = index % cols;
    return {
      x: 50 + col * 180,
      y: 50 + row * 150,
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

      // Ensure within bounds
      const maxX = floorWidth - block.width;
      const maxY = floorHeight - block.height;
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

      // Ensure within bounds - account for table size so it stays fully visible
      const maxX = floorWidth - tableWidth;
      const maxY = floorHeight - tableHeight;
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

      // Save all table positions (scaled if in fullscreen)
      const tablePositionPromises = Array.from(localPositions.entries()).map(([tableId, pos]) =>
        updateTablePosition({
          id: tableId,
          positionX: Math.round(pos.x * scaleX),
          positionY: Math.round(pos.y * scaleY),
        })
      );

      // Save all block positions (scaled if in fullscreen)
      const blockPositionPromises = Array.from(blockPositions.entries()).map(([blockId, pos]) =>
        updateVenueBlockPosition({
          id: blockId,
          positionX: Math.round(pos.x * scaleX),
          positionY: Math.round(pos.y * scaleY),
        })
      );

      // Save all table sizes
      const tableSizePromises = Array.from(tableSizes.entries()).map(([tableId, size]) =>
        updateTableSize({
          id: tableId,
          width: size.width,
          height: size.height,
        })
      );

      // Save all block sizes
      const blockSizePromises = Array.from(blockSizes.entries()).map(([blockId, size]) =>
        updateVenueBlockSize({
          id: blockId,
          width: size.width,
          height: size.height,
        })
      );

      // Save all table rotations
      const tableRotationPromises = Array.from(tableRotations.entries()).map(([tableId, rotation]) =>
        updateTableRotation({
          id: tableId,
          rotation,
        })
      );

      // Save all block rotations
      const blockRotationPromises = Array.from(blockRotations.entries()).map(([blockId, rotation]) =>
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
        toast.error(t("savePositionError"));
      } else {
        toast.success(t("positionsSaved"));
        setLocalPositions(new Map());
        setBlockPositions(new Map());
        setTableSizes(new Map());
        setBlockSizes(new Map());
        setTableRotations(new Map());
        setBlockRotations(new Map());
        // Dispatch event to refresh data
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
    } catch {
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

  // Floor plan content - reused in both normal and fullscreen modes
  const floorPlanContent = (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <FloorArea ref={floorRef} height={floorHeight} isFullscreen={isFullscreen}>
        {/* Fullscreen toggle button - always visible */}
        <Button
          variant="outline"
          size="icon"
          className="absolute top-2 end-2 z-50 bg-background/80 backdrop-blur-sm hover:bg-background"
          onClick={toggleFullscreen}
          title={isFullscreen ? t("exitFullscreen") : t("fullscreen")}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>

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
                onSeatClick={handleSeatClick}
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
              const shapeClass = VENUE_BLOCK_SHAPE_CLASSES[block.shape || "rectangleRounded"] || VENUE_BLOCK_SHAPE_CLASSES.rectangleRounded;
              const isConcave = block.shape === "concave" || block.shape === "concaveRounded";

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

              return (
                <div
                  className={cn(
                    "flex flex-col items-center justify-center shadow-lg cursor-grabbing",
                    !isConcave && "border-2",
                    !isConcave && colorClasses,
                    !isConcave && shapeClass
                  )}
                  style={{
                    width: size.width,
                    height: size.height,
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  {isConcave && (
                    <ConcaveShape
                      width={size.width}
                      height={size.height}
                      rounded={block.shape === "concaveRounded"}
                      borderColor={blockBorderColor}
                    />
                  )}
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

              // Prepare seats data
              const tableSeats = (table.seats || []).map((seat) => ({
                id: seat.id,
                seatNumber: seat.seatNumber,
                relativeX: seat.relativeX,
                relativeY: seat.relativeY,
                angle: seat.angle,
                guest: seat.guest ? {
                  id: seat.guest.id,
                  name: seat.guest.name,
                  rsvpStatus: seat.guest.rsvpStatus || "PENDING",
                } : null,
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
                        colorTheme: (table.colorTheme as TableColorTheme) || "default",
                        width: size.width,
                        height: size.height,
                        rotation: 0,
                      }}
                      seats={tableSeats}
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
              <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-card" />
              <span>{t("shapes.circle")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-3 rounded-none border-2 border-primary/50 bg-card" />
              <span>{t("shapes.rectangle")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-3 rounded-t-full rounded-b-none border-2 border-primary/50 bg-card" />
              <span>{t("shapes.concave")}</span>
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
            <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-card" />
            <span>{t("shapes.circle")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 rounded-none border-2 border-primary/50 bg-card" />
            <span>{t("shapes.rectangle")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 rounded-t-full rounded-b-none border-2 border-primary/50 bg-card" />
            <span>{t("shapes.concave")}</span>
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
      <div className="flex items-center justify-between gap-4 p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t("canvasHeight")}:</span>
          <Input
            type="number"
            min={MIN_FLOOR_HEIGHT}
            max={MAX_FLOOR_HEIGHT}
            value={heightInputValue}
            onChange={(e) => handleHeightInputChange(e.target.value)}
            className="w-24 h-8"
          />
          <span className="text-xs text-muted-foreground">px</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("presets")}:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleHeightChange(600)}
            className={cn("h-7", floorHeight === 600 && "bg-accent")}
          >
            {t("small")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleHeightChange(1200)}
            className={cn("h-7", floorHeight === 1200 && "bg-accent")}
          >
            {t("medium")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleHeightChange(2000)}
            className={cn("h-7", floorHeight === 2000 && "bg-accent")}
          >
            {t("large")}
          </Button>
        </div>
      </div>

      {/* Seat Assignment Dialog */}
      {selectedSeat && (
        <AssignSeatDialog
          open={assignSeatDialogOpen}
          onOpenChange={setAssignSeatDialogOpen}
          seatId={selectedSeat.seatId}
          seatNumber={selectedSeat.seatNumber}
          tableName={selectedSeat.tableName}
          currentGuest={selectedSeatGuest}
          availableGuests={availableGuests}
          onAssign={handleAssignSeat}
          onUnassign={handleUnassignSeat}
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
