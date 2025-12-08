"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

import { updateTablePosition } from "@/actions/seating";
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
  assignments: TableAssignment[];
  seatsUsed: number;
  seatsAvailable: number;
}

interface TableFloorPlanProps {
  tables: Table[];
  eventId: string;
  onAssignGuests: (tableId: string) => void;
  onEditTable: (table: { id: string; name: string; capacity: number; shape?: string | null }) => void;
}

interface LocalPosition {
  x: number;
  y: number;
}

const GRID_SIZE = 20; // Snap to grid
const TABLE_SIZE = {
  round: { width: 100, height: 100 },
  rectangular: { width: 140, height: 80 },
  oval: { width: 120, height: 80 },
};

function DraggableTable({
  table,
  localPosition,
  onAssignGuests,
  onEditTable,
}: {
  table: Table;
  localPosition?: LocalPosition;
  onAssignGuests: (tableId: string) => void;
  onEditTable: (table: { id: string; name: string; capacity: number; shape?: string | null }) => void;
}) {
  const t = useTranslations("seating");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.id,
    data: { table },
  });

  const shape = (table.shape || "round") as keyof typeof TABLE_SIZE;
  const size = TABLE_SIZE[shape];
  const isOverCapacity = table.seatsUsed > table.capacity;

  // Use local position if available, otherwise fall back to table's saved position
  const posX = localPosition?.x ?? table.positionX ?? 50;
  const posY = localPosition?.y ?? table.positionY ?? 50;

  const style = {
    position: "absolute" as const,
    left: posX,
    top: posY,
    width: size.width,
    height: size.height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 1000 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const shapeClasses = {
    round: "rounded-full",
    rectangular: "rounded-lg",
    oval: "rounded-full",
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...listeners}
          {...attributes}
          className={cn(
            "flex flex-col items-center justify-center border-2 shadow-md transition-shadow cursor-grab active:cursor-grabbing",
            "bg-card hover:shadow-lg",
            shapeClasses[shape],
            isOverCapacity ? "border-destructive" : "border-primary/50",
            isDragging && "shadow-xl"
          )}
          onDoubleClick={() => {
            setPopoverOpen(false);
            onEditTable(table);
          }}
        >
          <span className="font-semibold text-sm truncate max-w-[80%] pointer-events-none">
            {table.name}
          </span>
          <span className={cn(
            "text-xs pointer-events-none",
            isOverCapacity ? "text-destructive" : "text-muted-foreground"
          )}>
            {table.seatsUsed}/{table.capacity}
          </span>
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
              <Icons.userPlus className="mr-2 h-4 w-4" />
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
              <Icons.pencil className="mr-2 h-4 w-4" />
              {t("editTable")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FloorArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "floor-area",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative w-full h-[600px] border-2 border-dashed rounded-lg overflow-hidden",
        "bg-muted/20",
        isOver && "border-primary bg-primary/5"
      )}
      style={{
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

export function TableFloorPlan({
  tables,
  eventId,
  onAssignGuests,
  onEditTable,
}: TableFloorPlanProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [localPositions, setLocalPositions] = useState<Map<string, LocalPosition>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasUnsavedChanges = localPositions.size > 0;

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
    const tableId = active.id as string;
    const tableIndex = tables.findIndex((t) => t.id === tableId);
    const table = tables[tableIndex];

    if (!table || (delta.x === 0 && delta.y === 0)) return;

    // Get current position (local or saved)
    const currentPos = getTablePosition(table, tableIndex);

    // Snap to grid
    const newX = Math.round((currentPos.x + delta.x) / GRID_SIZE) * GRID_SIZE;
    const newY = Math.round((currentPos.y + delta.y) / GRID_SIZE) * GRID_SIZE;

    // Ensure within bounds
    const boundedX = Math.max(0, Math.min(newX, 800));
    const boundedY = Math.max(0, Math.min(newY, 500));

    // Update local state only (no server call)
    setLocalPositions((prev) => {
      const next = new Map(prev);
      next.set(tableId, { x: boundedX, y: boundedY });
      return next;
    });
  };

  const handleSavePositions = async () => {
    if (localPositions.size === 0) return;

    setIsSaving(true);
    try {
      // Save all positions in parallel
      const promises = Array.from(localPositions.entries()).map(([tableId, pos]) =>
        updateTablePosition({
          id: tableId,
          positionX: pos.x,
          positionY: pos.y,
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        toast.error(t("savePositionError"));
      } else {
        toast.success(t("positionsSaved"));
        setLocalPositions(new Map());
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
    toast.info(t("changesDiscarded"));
  };

  const handleConfirmDiscard = () => {
    setLocalPositions(new Map());
    setShowUnsavedDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  // Check if any tables have no position set
  const tablesNeedingPosition = tables.filter(
    (t) => t.positionX === null || t.positionY === null
  );

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Header with Save/Discard buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-primary/50 bg-card" />
            <span>{t("shapes.round")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 rounded-lg border-2 border-primary/50 bg-card" />
            <span>{t("shapes.rectangular")}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-3 rounded-full border-2 border-primary/50 bg-card" />
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
              {t("unsavedChanges", { count: localPositions.size })}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscardChanges}
              disabled={isSaving}
            >
              <Icons.close className="mr-2 h-4 w-4" />
              {tc("discard")}
            </Button>
            <Button
              size="sm"
              onClick={handleSavePositions}
              disabled={isSaving}
            >
              {isSaving ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.check className="mr-2 h-4 w-4" />
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <FloorArea>
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
                  onAssignGuests={onAssignGuests}
                  onEditTable={onEditTable}
                />
              );
            })
          )}

          {/* Drag indicator */}
          {activeDragId && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium shadow-lg">
              {t("dropToPosition")}
            </div>
          )}
        </FloorArea>
      </DndContext>

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
