"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { TableCard } from "./table-card";
import { AssignGuestsDialog } from "./assign-guests-dialog";
import { EditTableDialog } from "./edit-table-dialog";

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

interface TableGridViewProps {
  tables: Table[];
  eventId: string;
}

export function TableGridView({ tables, eventId }: TableGridViewProps) {
  const t = useTranslations("seating");

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

  if (tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium">{t("noTables")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("createFirstTable")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-8 md:grid-cols-2 2xl:grid-cols-3">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            eventId={eventId}
            onAssignGuests={handleAssignGuests}
            onEditTable={handleEditTable}
          />
        ))}
      </div>

      {/* Assign Guests Dialog */}
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

      {/* Edit Table Dialog */}
      <EditTableDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        table={selectedTableForEdit}
      />
    </>
  );
}
