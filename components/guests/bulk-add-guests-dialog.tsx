"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { createGuest } from "@/actions/guests";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";

interface BulkAddGuestsDialogProps {
  eventId: string;
}

interface GuestRow {
  id: string;
  name: string;
  phoneNumber: string;
  groupName: string;
}

const createEmptyRow = (): GuestRow => ({
  id: crypto.randomUUID(),
  name: "",
  phoneNumber: "",
  groupName: "",
});

export function BulkAddGuestsDialog({ eventId }: BulkAddGuestsDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isRTL = locale === "he";
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<GuestRow[]>([createEmptyRow(), createEmptyRow(), createEmptyRow()]);

  const updateRow = (id: string, field: keyof GuestRow, value: string) => {
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

    for (const guest of validGuests) {
      try {
        const result = await createGuest({
          weddingEventId: eventId,
          name: guest.name.trim(),
          phoneNumber: guest.phoneNumber.trim(),
          groupName: guest.groupName || undefined,
          notes: "",
        });

        if (result.error) {
          errorCount++;
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
    if (errorCount > 0) {
      toast.error(t("bulkAddErrors", { count: errorCount }));
    }

    if (successCount > 0) {
      setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
      setOpen(false);
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Icons.users className="me-2 h-4 w-4" />
          {t("bulkAdd")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl" dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("bulkAdd")}</DialogTitle>
          <DialogDescription>
            {t("bulkAddTableDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <ScrollArea className="h-[400px] rounded-md border" dir={isRTL ? "rtl" : "ltr"}>
            <Table dir={isRTL ? "rtl" : "ltr"}>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[220px] text-start">{t("name")} *</TableHead>
                  <TableHead className="w-[180px] text-start">{t("phone")}</TableHead>
                  <TableHead className="w-[180px] text-start">{t("group")}</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
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
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.phoneNumber}
                        onChange={(e) => updateRow(row.id, "phoneNumber", e.target.value)}
                        placeholder="050..."
                        className="h-9"
                        dir="ltr"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Select
                        value={row.groupName}
                        onValueChange={(value) => updateRow(row.id, "groupName", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={t("selectGroup")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">{t("groups.family")}</SelectItem>
                          <SelectItem value="friends">{t("groups.friends")}</SelectItem>
                          <SelectItem value="work">{t("groups.work")}</SelectItem>
                          <SelectItem value="other">{t("groups.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Icons.trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

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
  );
}
