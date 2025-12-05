"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { bulkImportGuests } from "@/actions/guests";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icons } from "@/components/shared/icons";

interface ImportGuestsDialogProps {
  eventId: string;
}

interface ParsedGuest {
  name: string;
  phoneNumber?: string;
  email?: string;
  side?: "bride" | "groom" | "both";
  groupName?: string;
  notes?: string;
}

export function ImportGuestsDialog({ eventId }: ImportGuestsDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedGuests, setParsedGuests] = useState<ParsedGuest[]>([]);
  const [fileName, setFileName] = useState("");

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const guests: ParsedGuest[] = jsonData.map((row: Record<string, unknown>) => {
          // Try to find columns by common names (Hebrew and English)
          const nameCol = row["name"] || row["Name"] || row["שם"] || row["שם מלא"];
          const phoneCol = row["phone"] || row["Phone"] || row["phoneNumber"] || row["טלפון"];
          const emailCol = row["email"] || row["Email"] || row["אימייל"];
          const sideCol = row["side"] || row["Side"] || row["צד"];
          const groupCol = row["group"] || row["Group"] || row["groupName"] || row["קבוצה"];
          const notesCol = row["notes"] || row["Notes"] || row["הערות"];

          // Map side values
          let side: "bride" | "groom" | "both" | undefined;
          const sideValue = String(sideCol || "").toLowerCase();
          if (sideValue.includes("bride") || sideValue.includes("כלה")) side = "bride";
          else if (sideValue.includes("groom") || sideValue.includes("חתן")) side = "groom";
          else if (sideValue.includes("both") || sideValue.includes("משותף")) side = "both";

          return {
            name: String(nameCol || "").trim(),
            phoneNumber: phoneCol ? String(phoneCol).trim() : undefined,
            email: emailCol ? String(emailCol).trim() : undefined,
            side,
            groupName: groupCol ? String(groupCol).trim() : undefined,
            notes: notesCol ? String(notesCol).trim() : undefined,
          };
        }).filter((g) => g.name); // Filter out empty rows

        setParsedGuests(guests);
        setFileName(file.name);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error(te("generic"));
      }
    };

    reader.readAsBinaryString(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleImport = async () => {
    if (parsedGuests.length === 0) {
      toast.error(t("noGuestsToImport"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await bulkImportGuests({
        weddingEventId: eventId,
        guests: parsedGuests,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("importedSuccess", { count: result.imported ?? 0 }));
      setParsedGuests([]);
      setFileName("");
      setOpen(false);
    } catch (error) {
      toast.error(te("generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Icons.upload className="me-2 h-4 w-4" />
          {t("import")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("import")}</DialogTitle>
          <DialogDescription>
            {t("importInstructions")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Icons.upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t("clickToUpload")}
              </p>
              <p className="text-xs text-muted-foreground">
                XLSX, XLS, CSV
              </p>
            </label>
          </div>

          {/* Preview */}
          {parsedGuests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {fileName} - {t("guestsFound", { count: parsedGuests.length })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsedGuests([]);
                    setFileName("");
                  }}
                >
                  <Icons.close className="h-4 w-4" />
                </Button>
              </div>

              <div className="max-h-60 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-start">{t("name")}</th>
                      <th className="p-2 text-start">{t("phone")}</th>
                      <th className="p-2 text-start">{t("email")}</th>
                      <th className="p-2 text-start">{t("side")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedGuests.slice(0, 10).map((guest, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{guest.name}</td>
                        <td className="p-2">{guest.phoneNumber || "-"}</td>
                        <td className="p-2">{guest.email || "-"}</td>
                        <td className="p-2">{guest.side || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedGuests.length > 10 && (
                  <p className="p-2 text-center text-xs text-muted-foreground">
                    {t("andMore", { count: parsedGuests.length - 10 })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleImport}
              disabled={isLoading || parsedGuests.length === 0}
            >
              {isLoading && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {tc("import")} ({parsedGuests.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
