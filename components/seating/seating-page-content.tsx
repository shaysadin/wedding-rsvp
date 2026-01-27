"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { getEventTables, getSeatingStats, getEventVenueBlocks } from "@/actions/seating";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SeatingStatsCompact } from "@/components/seating/seating-stats-compact";
import { SeatingViewToggle } from "@/components/seating/seating-view-toggle";
import { TableGridView } from "@/components/seating/table-grid-view";
import { TableFloorPlanSkeleton } from "@/components/skeletons";
import { AddTableDialogEnhanced } from "@/components/seating/add-table-dialog-enhanced";
import { AddVenueBlockDialog } from "@/components/seating/add-venue-block-dialog";
import { AssignGuestsDialog } from "@/components/seating/assign-guests-dialog";
import { EditTableDialog } from "@/components/seating/edit-table-dialog";
import { AutoArrangeStepper } from "@/components/seating/auto-arrange-stepper";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { type EventOption } from "@/components/events/event-dropdown-selector";

// Lazy load the heavy TableFloorPlan component
const TableFloorPlan = dynamic(
  () => import("@/components/seating/table-floor-plan").then((mod) => mod.TableFloorPlan),
  {
    loading: () => <TableFloorPlanSkeleton />,
    ssr: false,
  }
);

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

interface SeatingStatsType {
  totalTables: number;
  totalCapacity: number;
  seatedGuestsCount: number;
  unseatedGuestsCount: number;
  seatedByPartySize: number;
  unseatedByPartySize: number;
  capacityUsed: number;
  capacityRemaining: number;
}

interface VenueBlock {
  id: string;
  name: string;
  type: string;
  positionX?: number | null;
  positionY?: number | null;
  width: number;
  height: number;
  rotation: number;
}

type ViewMode = "grid" | "floor";

interface SeatingPageContentProps {
  eventId: string;
  events: EventOption[];
  locale: string;
}

export function SeatingPageContent({ eventId, events, locale }: SeatingPageContentProps) {
  const t = useTranslations("seating");
  const isRTL = locale === "he";

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [tables, setTables] = useState<Table[]>([]);
  const [venueBlocks, setVenueBlocks] = useState<VenueBlock[]>([]);
  const [stats, setStats] = useState<SeatingStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [autoArrangeOpen, setAutoArrangeOpen] = useState(false);

  // Floor plan dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTableForAssign, setSelectedTableForAssign] = useState<Table | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTableForEdit, setSelectedTableForEdit] = useState<Table | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleAssignGuests(tableId: string) {
    const table = tables.find((t) => t.id === tableId);
    if (table) {
      setSelectedTableForAssign(table);
      setAssignDialogOpen(true);
    }
  }

  function handleEditTable(table: { id: string; name: string; capacity: number; shape?: string | null }) {
    setSelectedTableForEdit(table as Table);
    setEditDialogOpen(true);
  }

  function copyHostessLink() {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    // Use current protocol (will be HTTP for LAN, HTTPS for external)
    const hostessUrl = `${baseUrl}/${locale}/hostess/${eventId}`;
    navigator.clipboard.writeText(hostessUrl);
    toast.success(isRTL ? "קישור הועתק ללוח" : "Link copied to clipboard");
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  const loadData = useCallback(async () => {
    if (!eventId) return;

    setIsLoading(true);
    try {
      const [tablesResult, statsResult, blocksResult] = await Promise.all([
        getEventTables(eventId),
        getSeatingStats(eventId),
        getEventVenueBlocks(eventId),
      ]);

      if (tablesResult.error) {
        toast.error(tablesResult.error);
      } else if (tablesResult.tables) {
        setTables(tablesResult.tables as Table[]);
      }

      if (statsResult.error) {
        toast.error(statsResult.error);
      } else if (statsResult.stats) {
        setStats(statsResult.stats);
      }

      if (blocksResult.error) {
        toast.error(blocksResult.error);
      } else if (blocksResult.blocks) {
        setVenueBlocks(blocksResult.blocks as VenueBlock[]);
      }
    } catch {
      toast.error("Failed to load seating data");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Load data when eventId changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for data refresh events - supports both full refresh and optimistic updates
  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;

      // If event has data, do optimistic update instead of full refresh
      if (detail?.type === "table-added" && detail.table) {
        setTables((prev) => [...prev, detail.table as Table]);
        // Update stats optimistically
        setStats((prev) => prev ? {
          ...prev,
          totalTables: prev.totalTables + 1,
          totalCapacity: prev.totalCapacity + (detail.table.capacity || 0),
          capacityRemaining: prev.capacityRemaining + (detail.table.capacity || 0),
        } : prev);
        return;
      }

      if (detail?.type === "table-updated" && detail.table) {
        setTables((prev) =>
          prev.map((t) => (t.id === detail.table.id ? { ...t, ...detail.table } : t))
        );
        return;
      }

      if (detail?.type === "table-deleted" && detail.tableId) {
        const deletedTable = tables.find((t) => t.id === detail.tableId);
        setTables((prev) => prev.filter((t) => t.id !== detail.tableId));
        // Update stats optimistically
        if (deletedTable) {
          setStats((prev) => prev ? {
            ...prev,
            totalTables: prev.totalTables - 1,
            totalCapacity: prev.totalCapacity - deletedTable.capacity,
            capacityRemaining: prev.capacityRemaining - deletedTable.seatsAvailable,
            seatedGuestsCount: prev.seatedGuestsCount - deletedTable.assignments.length,
          } : prev);
        }
        return;
      }

      if (detail?.type === "block-added" && detail.block) {
        setVenueBlocks((prev) => [...prev, detail.block as VenueBlock]);
        return;
      }

      if (detail?.type === "guests-assigned" && detail.tableId && detail.guestIds) {
        // Fast refresh: only reload tables and stats, no full page reload
        Promise.all([
          getEventTables(eventId),
          getSeatingStats(eventId),
        ]).then(([tablesResult, statsResult]) => {
          if (tablesResult.success && tablesResult.tables) {
            setTables(tablesResult.tables as Table[]);
          }
          if (statsResult.success && statsResult.stats) {
            setStats(statsResult.stats);
          }
        });
        return;
      }

      if (detail?.type === "positions-saved") {
        // Apply optimistic updates immediately to prevent visual glitch
        if (detail.updatedPositions) {
          const { tables: tablePos, blocks: blockPos, tableSizes: sizes, blockSizes: bSizes, tableRotations: tRot, blockRotations: bRot } = detail.updatedPositions;

          // Update tables with new positions immediately
          if (tablePos && Object.keys(tablePos).length > 0) {
            setTables((prevTables) =>
              prevTables.map((table) => {
                if (tablePos[table.id]) {
                  return {
                    ...table,
                    positionX: tablePos[table.id].x,
                    positionY: tablePos[table.id].y,
                    ...(sizes?.[table.id] && {
                      width: sizes[table.id].width,
                      height: sizes[table.id].height,
                    }),
                    ...(tRot?.[table.id] !== undefined && {
                      rotation: tRot[table.id],
                    }),
                  };
                }
                return table;
              })
            );
          }

          // Update blocks with new positions immediately
          if (blockPos && Object.keys(blockPos).length > 0) {
            setVenueBlocks((prevBlocks) =>
              prevBlocks.map((block) => {
                if (blockPos[block.id]) {
                  return {
                    ...block,
                    positionX: blockPos[block.id].x,
                    positionY: blockPos[block.id].y,
                    ...(bSizes?.[block.id] && {
                      width: bSizes[block.id].width,
                      height: bSizes[block.id].height,
                    }),
                    ...(bRot?.[block.id] !== undefined && {
                      rotation: bRot[block.id],
                    }),
                  };
                }
                return block;
              })
            );
          }
        }

        // Then fetch from server to confirm (in background, no visual impact)
        Promise.all([
          getEventTables(eventId),
          getEventVenueBlocks(eventId),
        ]).then(([tablesResult, blocksResult]) => {
          if (tablesResult.success && tablesResult.tables) {
            setTables(tablesResult.tables as Table[]);
          }
          if (blocksResult.success && blocksResult.blocks) {
            setVenueBlocks(blocksResult.blocks as VenueBlock[]);
          }
        });
        return;
      }

      // Full refresh for complex operations or when no detail provided
      loadData();
    };

    window.addEventListener("seating-data-changed", handleRefresh);
    return () => {
      window.removeEventListener("seating-data-changed", handleRefresh);
    };
  }, [loadData, tables]);

  // Get the selected event for displaying title
  const selectedEvent = events.find((e) => e.id === eventId) || events[0];

  return (
    <PageFadeIn>
      {/* Header */}
      <div className="space-y-4">
        {/* Title Row */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icons.layoutGrid className="h-4 w-4" />
            <span>{t("title")}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {selectedEvent?.title || t("title")}
          </h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Action */}
          <Button
            onClick={() => setAddTableOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            <Icons.add className="me-2 h-4 w-4" />
            {t("addTable")}
          </Button>

          {/* Secondary Actions */}
          <Button
            variant="outline"
            onClick={() => setAutoArrangeOpen(true)}
            className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900"
          >
            <Icons.sparkles className="me-2 h-4 w-4" />
            {t("autoArrange.button")}
          </Button>

          <Button
            variant="outline"
            onClick={() => setAddBlockOpen(true)}
            className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            <Icons.add className="me-2 h-4 w-4" />
            {t("venueBlocks.add")}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={copyHostessLink}
                  className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                >
                  <span className="relative me-2 h-4 w-4">
                    <Icons.copy className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${linkCopied ? "scale-0 opacity-0" : "scale-100 opacity-100"}`} />
                    <Icons.check className={`absolute inset-0 h-4 w-4 transition-all duration-300 ${linkCopied ? "scale-100 opacity-100" : "scale-0 opacity-0"}`} />
                  </span>
                  <span className="hidden sm:inline">{isRTL ? "קישור לאשת קבלה" : "Hostess Link"}</span>
                  <span className="sm:hidden">{isRTL ? "קישור" : "Link"}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRTL ? "העתק קישור לרשימת אורחים עבור אשת קבלה" : "Copy guest list link for hostess"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex h-full w-full items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6 overflow-auto">
          {/* Stats Cards */}
          {stats && <SeatingStatsCompact stats={stats} />}

          {/* View Toggle and Table Content */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t("tables")}</h2>
              <SeatingViewToggle value={viewMode} onChange={setViewMode} />
            </div>

            {viewMode === "grid" ? (
              <TableGridView tables={tables} eventId={eventId} />
            ) : (
              <TableFloorPlan
                tables={tables}
                venueBlocks={venueBlocks}
                eventId={eventId}
                onAssignGuests={handleAssignGuests}
                onEditTable={handleEditTable}
              />
            )}
          </div>
        </div>
      )}

      {/* Add Table Dialog */}
      <AddTableDialogEnhanced
        open={addTableOpen}
        onOpenChange={setAddTableOpen}
        eventId={eventId}
      />

      {/* Add Venue Block Dialog */}
      <AddVenueBlockDialog
        open={addBlockOpen}
        onOpenChange={setAddBlockOpen}
        eventId={eventId}
      />

      {/* Floor Plan Dialogs */}
      {selectedTableForAssign && (
        <AssignGuestsDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          tableId={selectedTableForAssign.id}
          tableName={selectedTableForAssign.name}
          availableSeats={selectedTableForAssign.seatsAvailable}
          eventId={eventId}
        />
      )}

      <EditTableDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        table={selectedTableForEdit}
      />

      {/* Auto Arrange Stepper */}
      <AutoArrangeStepper
        open={autoArrangeOpen}
        onOpenChange={setAutoArrangeOpen}
        eventId={eventId}
      />
    </PageFadeIn>
  );
}
