"use client";

import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Maximize2, Minimize2, GripHorizontal } from "lucide-react";

import { updateTablePosition, updateTableSize, updateTableRotation, updateVenueBlockPosition, updateVenueBlockSize, updateVenueBlockRotation, deleteVenueBlock } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onEditTable: (table: { id: string; name: string; capacity: number; shape?: string | null }) => void;
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
}: {
  table: Table;
  localPosition?: LocalPosition;
  localSize?: LocalSize;
  localRotation?: number;
  onAssignGuests: (tableId: string) => void;
  onEditTable: (table: { id: string; name: string; capacity: number; shape?: string | null }) => void;
  onResizeStart: (id: string, type: "table" | "block") => void;
  onResize: (id: string, type: "table" | "block", width: number, height: number) => void;
  onResizeEnd: (id: string, type: "table" | "block") => void;
  onRotate: (id: string, type: "table" | "block") => void;
  isResizing: boolean;
}) {
  const t = useTranslations("seating");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    data: { table },
    disabled: isResizing,
  });

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

  // Resize handle mouse down handler - accounts for rotation
  // Element position stays fixed, only size changes (resize from top-left corner)
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();

    onResizeStart(table.id, "table");
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    // Convert rotation to radians for transformation
    const rotationRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      // Get mouse delta in screen coordinates
      const screenDeltaX = moveEvent.clientX - startX;
      const screenDeltaY = moveEvent.clientY - startY;

      // Rotate the delta back to local coordinates (inverse rotation)
      const localDeltaX = screenDeltaX * cos + screenDeltaY * sin;
      const localDeltaY = -screenDeltaX * sin + screenDeltaY * cos;

      // All handles resize from the top-left corner (element stays in place)
      // East/West handles control width
      if (handle.includes("e") || handle.includes("w")) {
        const widthDelta = handle.includes("e") ? localDeltaX : -localDeltaX;
        newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startWidth + widthDelta));
      }
      // South/North handles control height
      if (handle.includes("s") || handle.includes("n")) {
        const heightDelta = handle.includes("s") ? localDeltaY : -localDeltaY;
        newHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startHeight + heightDelta));
      }

      // Don't snap during resize - smooth resize follows cursor
      onResize(table.id, "table", newWidth, newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      onResizeEnd(table.id, "table");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // All 8 resize handles (element stays in place during resize)
  const resizeHandles = [
    { position: "n", cursor: "ns-resize", className: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-2" },
    { position: "s", cursor: "ns-resize", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-2" },
    { position: "e", cursor: "ew-resize", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-4" },
    { position: "w", cursor: "ew-resize", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-4" },
    { position: "ne", cursor: "nesw-resize", className: "top-0 right-0 -translate-y-1/2 translate-x-1/2 w-3 h-3" },
    { position: "nw", cursor: "nwse-resize", className: "top-0 left-0 -translate-y-1/2 -translate-x-1/2 w-3 h-3" },
    { position: "se", cursor: "nwse-resize", className: "bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-3 h-3" },
    { position: "sw", cursor: "nesw-resize", className: "bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-3 h-3" },
  ];

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...(isResizing ? {} : listeners)}
          {...(isResizing ? {} : attributes)}
          className={cn(
            "flex flex-col items-center justify-center shadow-md transition-shadow group relative",
            !isResizing && "cursor-grab active:cursor-grabbing",
            "hover:shadow-lg",
            isDragging && "shadow-xl",
            // Only apply border and background classes for non-concave shapes
            !isConcave && [
              "border-2 bg-card",
              shapeClasses[shape] || shapeClasses.circle,
              isOverCapacity ? "border-destructive" : "border-primary/50",
            ]
          )}
          onDoubleClick={() => {
            setPopoverOpen(false);
            onEditTable(table);
          }}
        >
          {/* SVG background for concave shapes */}
          {isConcave && (
            <ConcaveShape
              width={width}
              height={height}
              rounded={shape === "concaveRounded"}
              borderColor={borderColor}
            />
          )}
          <span className="font-semibold text-sm truncate max-w-[80%] pointer-events-none z-10">
            {table.name}
          </span>
          <span className={cn(
            "text-xs pointer-events-none z-10",
            isOverCapacity ? "text-destructive" : "text-muted-foreground"
          )}>
            {table.seatsUsed}/{table.capacity}
          </span>

          {/* Resize handles */}
          {resizeHandles.map(({ position, cursor, className }) => (
            <div
              key={position}
              className={cn(
                "absolute bg-primary rounded-sm opacity-0 group-hover:opacity-100 transition-opacity",
                className,
                hoveredHandle === position && "opacity-100 bg-primary/80"
              )}
              style={{ cursor }}
              onMouseDown={(e) => handleResizeMouseDown(e, position)}
              onMouseEnter={() => setHoveredHandle(position)}
              onMouseLeave={() => setHoveredHandle(null)}
            />
          ))}

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
          </div>
        </div>
      </PopoverContent>
    </Popover>
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
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
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

  // Resize handle mouse down handler - accounts for rotation
  // Element position stays fixed, only size changes (resize from top-left corner)
  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();

    onResizeStart(block.id, "block");
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    // Convert rotation to radians for transformation
    const rotationRad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rotationRad);
    const sin = Math.sin(rotationRad);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;

      // Get mouse delta in screen coordinates
      const screenDeltaX = moveEvent.clientX - startX;
      const screenDeltaY = moveEvent.clientY - startY;

      // Rotate the delta back to local coordinates (inverse rotation)
      const localDeltaX = screenDeltaX * cos + screenDeltaY * sin;
      const localDeltaY = -screenDeltaX * sin + screenDeltaY * cos;

      // All handles resize from the top-left corner (element stays in place)
      // East/West handles control width
      if (handle.includes("e") || handle.includes("w")) {
        const widthDelta = handle.includes("e") ? localDeltaX : -localDeltaX;
        newWidth = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startWidth + widthDelta));
      }
      // South/North handles control height
      if (handle.includes("s") || handle.includes("n")) {
        const heightDelta = handle.includes("s") ? localDeltaY : -localDeltaY;
        newHeight = Math.max(MIN_SIZE, Math.min(MAX_SIZE, startHeight + heightDelta));
      }

      // Don't snap during resize - smooth resize follows cursor
      onResize(block.id, "block", newWidth, newHeight);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      onResizeEnd(block.id, "block");
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // All 8 resize handles (element stays in place during resize)
  const resizeHandles = [
    { position: "n", cursor: "ns-resize", className: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-2" },
    { position: "s", cursor: "ns-resize", className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-4 h-2" },
    { position: "e", cursor: "ew-resize", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2 h-4" },
    { position: "w", cursor: "ew-resize", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-4" },
    { position: "ne", cursor: "nesw-resize", className: "top-0 right-0 -translate-y-1/2 translate-x-1/2 w-3 h-3" },
    { position: "nw", cursor: "nwse-resize", className: "top-0 left-0 -translate-y-1/2 -translate-x-1/2 w-3 h-3" },
    { position: "se", cursor: "nwse-resize", className: "bottom-0 right-0 translate-y-1/2 translate-x-1/2 w-3 h-3" },
    { position: "sw", cursor: "nesw-resize", className: "bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-3 h-3" },
  ];

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

            {/* Resize handles */}
            {resizeHandles.map(({ position, cursor, className }) => (
              <div
                key={position}
                className={cn(
                  "absolute bg-primary rounded-sm opacity-0 group-hover:opacity-100 transition-opacity z-20",
                  className,
                  hoveredHandle === position && "opacity-100 bg-primary/80"
                )}
                style={{ cursor }}
                onMouseDown={(e) => handleResizeMouseDown(e, position)}
                onMouseEnter={() => setHoveredHandle(position)}
                onMouseLeave={() => setHoveredHandle(null)}
              />
            ))}

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
          "bg-muted/20",
          isOver && "border-primary bg-primary/5",
          isFullscreen && "rounded-none border-0"
        )}
        style={{
          height: isFullscreen ? "100%" : height,
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
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
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  // Store base dimensions (non-fullscreen) for proper position saving
  const baseFloorDimensions = useRef({ width: 800, height: DEFAULT_FLOOR_HEIGHT });

  // Load floor height from localStorage on mount
  useEffect(() => {
    const savedHeight = localStorage.getItem(FLOOR_HEIGHT_STORAGE_KEY);
    if (savedHeight) {
      const height = parseInt(savedHeight, 10);
      if (!isNaN(height) && height >= MIN_FLOOR_HEIGHT && height <= MAX_FLOOR_HEIGHT) {
        setFloorHeight(height);
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

  // Height resize handler
  const handleHeightResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingHeight(true);
    const startY = e.clientY;
    const startHeight = floorHeight;
    let currentHeight = startHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      currentHeight = Math.max(MIN_FLOOR_HEIGHT, Math.min(MAX_FLOOR_HEIGHT, startHeight + deltaY));
      setFloorHeight(currentHeight);
      // Update base dimensions as we resize
      if (floorRef.current) {
        baseFloorDimensions.current = {
          width: floorRef.current.clientWidth,
          height: currentHeight,
        };
      }
    };

    const handleMouseUp = () => {
      setIsResizingHeight(false);
      // Save the final height to localStorage
      localStorage.setItem(FLOOR_HEIGHT_STORAGE_KEY, currentHeight.toString());
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [floorHeight]);

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

  // Configure sensors with distance activation - drag only starts after moving 8px
  // This allows clicks to pass through for the popover
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

      // Snap to grid
      const newX = Math.round((currentPos.x + delta.x) / GRID_SIZE) * GRID_SIZE;
      const newY = Math.round((currentPos.y + delta.y) / GRID_SIZE) * GRID_SIZE;

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

      // Snap to grid
      const newX = Math.round((currentPos.x + delta.x) / GRID_SIZE) * GRID_SIZE;
      const newY = Math.round((currentPos.y + delta.y) / GRID_SIZE) * GRID_SIZE;

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
    // Snap size to grid on resize end
    if (type === "table") {
      setTableSizes((prev) => {
        const size = prev.get(id);
        if (!size) return prev;
        const next = new Map(prev);
        next.set(id, {
          width: Math.round(size.width / GRID_SIZE) * GRID_SIZE,
          height: Math.round(size.height / GRID_SIZE) * GRID_SIZE,
        });
        return next;
      });
    } else {
      setBlockSizes((prev) => {
        const size = prev.get(id);
        if (!size) return prev;
        const next = new Map(prev);
        next.set(id, {
          width: Math.round(size.width / GRID_SIZE) * GRID_SIZE,
          height: Math.round(size.height / GRID_SIZE) * GRID_SIZE,
        });
        return next;
      });
    }
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

      {/* Resize Handle */}
      <div
        className={cn(
          "flex items-center justify-center h-3 -mt-2 cursor-ns-resize group select-none",
          isResizingHeight && "cursor-ns-resize"
        )}
        onMouseDown={handleHeightResizeStart}
      >
        <div className={cn(
          "flex items-center justify-center w-24 h-2 rounded-full transition-colors",
          "bg-muted hover:bg-muted-foreground/30",
          isResizingHeight && "bg-primary/50"
        )}>
          <GripHorizontal className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>

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
