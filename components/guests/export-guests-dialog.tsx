"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import * as XLSX from "xlsx";
import { Guest, GuestRsvp, NotificationLog, VapiCallLog } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { GlowingButton } from "@/components/ui/glowing-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/shared/icons";

type GuestWithRsvpAndTable = Guest & {
  rsvp: GuestRsvp | null;
  notificationLogs: NotificationLog[];
  vapiCallLogs?: VapiCallLog[];
  tableAssignment?: {
    table: { name: string };
  } | null;
};

interface ExportGuestsDialogProps {
  eventId: string;
  guests: GuestWithRsvpAndTable[];
}

const ALL_COLUMNS = [
  "name",
  "phone",
  "side",
  "group",
  "status",
  "guestCount",
  "notes",
  "table",
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number];

const COLUMN_HEADERS: Record<ColumnKey, string> = {
  name: "שם / Name",
  phone: "טלפון / Phone",
  side: "צד / Side",
  group: "קבוצה / Group",
  status: "סטטוס / Status",
  guestCount: "מספר אורחים / Guests",
  notes: "הערות / Notes",
  table: "שולחן / Table",
};

const PREDEFINED_SIDES = ["bride", "groom", "both"] as const;
const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;

export function ExportGuestsDialog({ guests }: ExportGuestsDialogProps) {
  const t = useTranslations("guests.exportDialog");
  const tc = useTranslations("common");
  const tSides = useTranslations("guests.sides");
  const tGroups = useTranslations("guests.groups");
  const tStatuses = useTranslations("guests.statuses");

  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [statusFilter, setStatusFilter] = useState<string[]>(["all"]);
  const [sideFilter, setSideFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [columns, setColumns] = useState<ColumnKey[]>([...ALL_COLUMNS]);

  // Get unique sides and groups from guests
  const uniqueSides = useMemo(() => {
    const sides = new Set<string>();
    guests.forEach((g) => {
      if (g.side) sides.add(g.side);
    });
    return Array.from(sides);
  }, [guests]);

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    guests.forEach((g) => {
      if (g.groupName) groups.add(g.groupName);
    });
    return Array.from(groups);
  }, [guests]);

  // Filter guests based on selected filters
  const filteredGuests = useMemo(() => {
    return guests.filter((guest) => {
      // Status filter
      if (!statusFilter.includes("all")) {
        const guestStatus = guest.rsvp?.status?.toLowerCase() || "pending";
        if (!statusFilter.includes(guestStatus)) return false;
      }

      // Side filter
      if (sideFilter !== "all" && guest.side !== sideFilter) return false;

      // Group filter
      if (groupFilter !== "all" && guest.groupName !== groupFilter) return false;

      return true;
    });
  }, [guests, statusFilter, sideFilter, groupFilter]);

  const handleStatusToggle = (status: string) => {
    if (status === "all") {
      setStatusFilter(["all"]);
      return;
    }
    setStatusFilter((prev) => {
      const withoutAll = prev.filter((s) => s !== "all");
      if (withoutAll.includes(status)) {
        const newFilter = withoutAll.filter((s) => s !== status);
        return newFilter.length === 0 ? ["all"] : newFilter;
      }
      return [...withoutAll, status];
    });
  };

  const handleColumnToggle = (col: ColumnKey) => {
    setColumns((prev) => {
      if (prev.includes(col)) {
        return prev.filter((c) => c !== col);
      }
      return [...prev, col];
    });
  };

  const translateSide = (side: string | null) => {
    if (!side) return "";
    if (PREDEFINED_SIDES.includes(side as (typeof PREDEFINED_SIDES)[number])) {
      return tSides(side as (typeof PREDEFINED_SIDES)[number]);
    }
    return side;
  };

  const translateGroup = (group: string | null) => {
    if (!group) return "";
    if (PREDEFINED_GROUPS.includes(group as (typeof PREDEFINED_GROUPS)[number])) {
      return tGroups(group as (typeof PREDEFINED_GROUPS)[number]);
    }
    return group;
  };

  const translateStatus = (status: string | undefined | null) => {
    const s = (status || "PENDING").toLowerCase();
    if (["pending", "accepted", "declined", "maybe"].includes(s)) {
      return tStatuses(s as "pending" | "accepted" | "declined" | "maybe");
    }
    return s;
  };

  const getGuestValue = (guest: GuestWithRsvpAndTable, col: ColumnKey): string | number => {
    switch (col) {
      case "name":
        return guest.name;
      case "phone":
        return guest.phoneNumber || "";
      case "side":
        return translateSide(guest.side);
      case "group":
        return translateGroup(guest.groupName);
      case "status":
        return translateStatus(guest.rsvp?.status);
      case "guestCount":
        return guest.rsvp?.guestCount ?? guest.expectedGuests;
      case "notes":
        return guest.notes || "";
      case "table":
        return guest.tableAssignment?.table?.name || "";
      default:
        return "";
    }
  };

  const handleExport = () => {
    if (filteredGuests.length === 0) return;

    // Build rows
    const rows = filteredGuests.map((guest) => {
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        row[COLUMN_HEADERS[col]] = getGuestValue(guest, col);
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guests");

    const fileName = `${t("fileName")}_${new Date().toISOString().split("T")[0]}`;

    if (format === "xlsx") {
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } else {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }

    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <GlowingButton glowColor="#f97316" className="w-full sm:w-auto">
          <Icons.download className="h-4 w-4" />
          <span>{t("button")}</span>
        </GlowingButton>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>{t("format")}</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "xlsx" | "csv")}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="xlsx" id="format-xlsx" />
                <Label htmlFor="format-xlsx" className="cursor-pointer font-normal">
                  Excel (.xlsx)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="csv" id="format-csv" />
                <Label htmlFor="format-csv" className="cursor-pointer font-normal">
                  CSV (.csv)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Filters */}
          <div className="space-y-3">
            <Label>{t("filters")}</Label>

            {/* RSVP Status Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("col_status")}</Label>
              <div className="flex flex-wrap gap-2">
                {["all", "accepted", "pending", "declined", "maybe"].map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={
                      (status === "all" && statusFilter.includes("all")) ||
                      (status !== "all" && statusFilter.includes(status))
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleStatusToggle(status)}
                  >
                    {status === "all" ? t("allStatuses") : tStatuses(status as "pending" | "accepted" | "declined" | "maybe")}
                  </Button>
                ))}
              </div>
            </div>

            {/* Side Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("col_side")}</Label>
              <Select value={sideFilter} onValueChange={setSideFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  {uniqueSides.map((side) => (
                    <SelectItem key={side} value={side}>
                      {translateSide(side)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Group Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("col_group")}</Label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatuses")}</SelectItem>
                  {uniqueGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {translateGroup(group)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Column Selection */}
          <div className="space-y-2">
            <Label>{t("columns")}</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_COLUMNS.map((col) => (
                <div key={col} className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${col}`}
                    checked={columns.includes(col)}
                    onCheckedChange={() => handleColumnToggle(col)}
                  />
                  <Label htmlFor={`col-${col}`} className="cursor-pointer text-sm font-normal">
                    {t(`col_${col}` as
                      | "col_name"
                      | "col_phone"
                      | "col_side"
                      | "col_group"
                      | "col_status"
                      | "col_guestCount"
                      | "col_notes"
                      | "col_table"
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Preview count */}
          <div className="text-sm text-muted-foreground">
            {filteredGuests.length > 0
              ? t("preview", { count: filteredGuests.length })
              : t("noGuests")}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleExport} disabled={filteredGuests.length === 0 || columns.length === 0}>
            {t("export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
