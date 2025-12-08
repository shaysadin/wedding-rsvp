"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";

import { getEventTables, getSeatingStats } from "@/actions/seating";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { SeatingStats } from "@/components/seating/seating-stats";
import { SeatingViewToggle } from "@/components/seating/seating-view-toggle";
import { TableGridView } from "@/components/seating/table-grid-view";
import { TableFloorPlan } from "@/components/seating/table-floor-plan";
import { AddTableDialog } from "@/components/seating/add-table-dialog";
import { AssignGuestsDialog } from "@/components/seating/assign-guests-dialog";
import { EditTableDialog } from "@/components/seating/edit-table-dialog";

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

type ViewMode = "grid" | "floor";

interface SeatingPageProps {
  params: Promise<{ eventId: string; locale: string }>;
}

export default function SeatingPage({ params }: SeatingPageProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");

  const [eventId, setEventId] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>("en");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [tables, setTables] = useState<Table[]>([]);
  const [stats, setStats] = useState<SeatingStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addTableOpen, setAddTableOpen] = useState(false);

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

  // Resolve params on mount
  useEffect(() => {
    params.then((p) => {
      setEventId(p.eventId);
      setLocale(p.locale);
    });
  }, [params]);

  const loadData = useCallback(async () => {
    if (!eventId) return;

    setIsLoading(true);
    try {
      const [tablesResult, statsResult] = await Promise.all([
        getEventTables(eventId),
        getSeatingStats(eventId),
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
    } catch {
      toast.error("Failed to load seating data");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  // Load data when eventId is available
  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId, loadData]);

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

  if (!eventId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader heading={t("title")} text={t("description")}>
        <div className="flex flex-row flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${locale}/dashboard/events/${eventId}`}>
              <Icons.arrowLeft className="mr-2 h-4 w-4" />
              {tc("back")}
            </Link>
          </Button>
          <Button onClick={() => setAddTableOpen(true)}>
            <Icons.add className="mr-2 h-4 w-4" />
            {t("addTable")}
          </Button>
        </div>
      </DashboardHeader>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && <SeatingStats stats={stats} />}

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
                eventId={eventId}
                onAssignGuests={handleAssignGuests}
                onEditTable={handleEditTable}
              />
            )}
          </div>
        </div>
      )}

      {/* Add Table Dialog */}
      <AddTableDialog
        open={addTableOpen}
        onOpenChange={setAddTableOpen}
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
    </>
  );
}
