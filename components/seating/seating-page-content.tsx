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
import { AutoArrangeDialog } from "@/components/seating/auto-arrange-dialog";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";

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
    const hostessUrl = `${baseUrl}/${locale}/hostess/${eventId}`;
    navigator.clipboard.writeText(hostessUrl);
    toast.success(isRTL ? "קישור הועתק ללוח" : "Link copied to clipboard");
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

  // Listen for data refresh events
  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener("seating-data-changed", handleRefresh);
    return () => {
      window.removeEventListener("seating-data-changed", handleRefresh);
    };
  }, [loadData]);

  return (
    <PageFadeIn>
      {/* Header with Event Dropdown */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EventDropdownSelector
            events={events}
            selectedEventId={eventId}
            locale={locale}
            basePath={`/${locale}/dashboard/seating`}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={copyHostessLink}>
                  <Icons.copy className="me-2 h-4 w-4" />
                  {isRTL ? "קישור לאשת קבלה" : "Hostess Link"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRTL ? "העתק קישור לרשימת אורחים עבור אשת קבלה" : "Copy guest list link for hostess"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="outline" onClick={() => setAutoArrangeOpen(true)}>
            <Icons.sparkles className="me-2 h-4 w-4" />
            {t("autoArrange.button")}
          </Button>
          <Button variant="outline" onClick={() => setAddBlockOpen(true)}>
            <Icons.add className="me-2 h-4 w-4" />
            {t("venueBlocks.add")}
          </Button>
          <Button onClick={() => setAddTableOpen(true)}>
            <Icons.add className="me-2 h-4 w-4" />
            {t("addTable")}
          </Button>
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

      {/* Auto Arrange Dialog */}
      <AutoArrangeDialog
        open={autoArrangeOpen}
        onOpenChange={setAutoArrangeOpen}
        eventId={eventId}
      />
    </PageFadeIn>
  );
}
