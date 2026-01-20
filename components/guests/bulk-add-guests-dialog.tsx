"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { createGuest } from "@/actions/guests";
import { Button } from "@/components/ui/button";
import { GlowingButton } from "@/components/ui/glowing-button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Icons } from "@/components/shared/icons";
import { DuplicateErrorDialog } from "./duplicate-error-dialog";

interface BulkAddGuestsDialogProps {
  eventId: string;
}

interface GuestRow {
  id: string;
  name: string;
  phoneNumber: string;
  side: string;
  groupName: string;
  expectedGuests: number;
  showCustomSide: boolean;
  showCustomGroup: boolean;
}

const createEmptyRow = (): GuestRow => ({
  id: crypto.randomUUID(),
  name: "",
  phoneNumber: "",
  side: "",
  groupName: "",
  expectedGuests: 1,
  showCustomSide: false,
  showCustomGroup: false,
});

export function BulkAddGuestsDialog({ eventId }: BulkAddGuestsDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<GuestRow[]>([createEmptyRow(), createEmptyRow(), createEmptyRow()]);

  // Duplicate error dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatesWithExisting, setDuplicatesWithExisting] = useState<{ name: string; phone: string; existingName?: string; existingGuestId?: string }[]>([]);

  const updateRow = (id: string, field: keyof GuestRow, value: string | number) => {
    setRows(rows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const getValidGuests = () => {
    return rows.filter(row => row.name.trim() !== "");
  };

  const handleSubmit = async () => {
    const validGuests = getValidGuests();

    if (validGuests.length === 0) {
      toast.error(t("noGuestsToAdd"));
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    const collectedDuplicates: { name: string; phone: string; existingName?: string; existingGuestId?: string }[] = [];

    for (const guest of validGuests) {
      try {
        const result = await createGuest({
          weddingEventId: eventId,
          name: guest.name.trim(),
          phoneNumber: guest.phoneNumber.trim(),
          side: guest.side as "bride" | "groom" | "both" | undefined || undefined,
          groupName: guest.groupName || undefined,
          expectedGuests: guest.expectedGuests || 1,
          notes: "",
        });

        if (result.error) {
          errorCount++;
          if (result.error === "DUPLICATE_PHONE" && "duplicateNames" in result) {
            const typedResult = result as {
              error: string;
              duplicateNames: string[];
              duplicateGuestIds?: string[]
            };
            collectedDuplicates.push({
              name: guest.name,
              phone: guest.phoneNumber,
              existingName: typedResult.duplicateNames.join(", "),
              existingGuestId: typedResult.duplicateGuestIds?.[0],
            });
          }
        } else {
          successCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setIsLoading(false);

    if (successCount > 0) {
      toast.success(t("bulkAddSuccess", { count: successCount }));
    }
    if (collectedDuplicates.length > 0) {
      // Show duplicate phone errors in modal
      setDuplicatesWithExisting(collectedDuplicates);
      setDuplicateDialogOpen(true);
    } else if (errorCount > 0) {
      toast.error(t("bulkAddErrors", { count: errorCount }));
    }

    if (successCount > 0) {
      setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
      setOpen(false);
      // Dispatch event to refresh duplicate warning
      window.dispatchEvent(new CustomEvent("guests-data-changed"));
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    }
  };

  const validCount = getValidGuests().length;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <GlowingButton glowColor="#8b5cf6" className="w-full sm:w-auto">
          <Icons.users className="h-4 w-4" />
          <span>{t("bulkAdd")}</span>
        </GlowingButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("bulkAdd")}</DialogTitle>
          <DialogDescription>
            {t("bulkAddTableDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Scrollable container - both X and Y axis */}
          <div className="max-h-100 min-h-80 overflow-auto rounded-md border">
            <Table className="min-w-175">
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[160px] text-start sticky top-0 bg-muted/50">{t("name")} *</TableHead>
                  <TableHead className="min-w-[140px] text-start sticky top-0 bg-muted/50">{t("phone")}</TableHead>
                  <TableHead className="min-w-[130px] text-start sticky top-0 bg-muted/50">{t("side")}</TableHead>
                  <TableHead className="min-w-[130px] text-start sticky top-0 bg-muted/50">{t("group")}</TableHead>
                  <TableHead className="min-w-[80px] text-start sticky top-0 bg-muted/50">{t("guestCount")}</TableHead>
                  <TableHead className="min-w-[50px] sticky top-0 bg-muted/50"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="p-2">
                      <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.id, "name", e.target.value)}
                        placeholder={t("namePlaceholder")}
                        className="h-10 min-w-[140px] text-base"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.phoneNumber}
                        onChange={(e) => updateRow(row.id, "phoneNumber", e.target.value)}
                        placeholder="050..."
                        className="h-10 min-w-[120px] text-base"
                        dir="ltr"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      {!row.showCustomSide ? (
                        <Select
                          value={row.side}
                          onValueChange={(value) => {
                            if (value === "__custom__") {
                              setRows(rows.map(r =>
                                r.id === row.id ? { ...r, showCustomSide: true, side: "" } : r
                              ));
                            } else {
                              updateRow(row.id, "side", value);
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 min-w-[110px] text-base">
                            <SelectValue placeholder={t("selectSide")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bride">{t("sides.bride")}</SelectItem>
                            <SelectItem value="groom">{t("sides.groom")}</SelectItem>
                            <SelectItem value="both">{t("sides.both")}</SelectItem>
                            <SelectItem value="__custom__">{t("customSide")}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-1">
                          <Input
                            value={row.side}
                            onChange={(e) => updateRow(row.id, "side", e.target.value)}
                            placeholder={t("customSidePlaceholder")}
                            className="h-10 text-base"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            onClick={() => {
                              setRows(rows.map(r =>
                                r.id === row.id ? { ...r, showCustomSide: false, side: "" } : r
                              ));
                            }}
                          >
                            <Icons.close className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      {!row.showCustomGroup ? (
                        <Select
                          value={row.groupName}
                          onValueChange={(value) => {
                            if (value === "__custom__") {
                              setRows(rows.map(r =>
                                r.id === row.id ? { ...r, showCustomGroup: true, groupName: "" } : r
                              ));
                            } else {
                              updateRow(row.id, "groupName", value);
                            }
                          }}
                        >
                          <SelectTrigger className="h-10 min-w-[110px] text-base">
                            <SelectValue placeholder={t("selectGroup")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="family">{t("groups.family")}</SelectItem>
                            <SelectItem value="friends">{t("groups.friends")}</SelectItem>
                            <SelectItem value="work">{t("groups.work")}</SelectItem>
                            <SelectItem value="other">{t("groups.other")}</SelectItem>
                            <SelectItem value="__custom__">{t("customGroup")}</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-1">
                          <Input
                            value={row.groupName}
                            onChange={(e) => updateRow(row.id, "groupName", e.target.value)}
                            placeholder={t("customGroupPlaceholder")}
                            className="h-10 text-base"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            onClick={() => {
                              setRows(rows.map(r =>
                                r.id === row.id ? { ...r, showCustomGroup: false, groupName: "" } : r
                              ));
                            }}
                          >
                            <Icons.close className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={row.expectedGuests}
                        onChange={(e) => updateRow(row.id, "expectedGuests", parseInt(e.target.value) || 1)}
                        className="h-10 w-20 text-base text-center"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button
            variant="outline"
            onClick={addRow}
            className="w-full"
          >
            <Icons.add className="me-2 h-4 w-4" />
            {t("addRow")}
          </Button>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {validCount > 0
                ? t("validGuestsCount", { count: validCount })
                : t("fillAtLeastOne")
              }
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {tc("cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || validCount === 0}
              >
                {isLoading && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                {t("addGuests", { count: validCount || 0 })}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      <DuplicateErrorDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        duplicatesWithExisting={duplicatesWithExisting}
        onSkipDuplicate={(phone) => {
          // Remove the duplicate from the list by phone number
          setDuplicatesWithExisting(prev => prev.filter(d => d.phone !== phone));
        }}
      />
    </>
  );
}
