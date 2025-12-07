"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { bulkImportGuests } from "@/actions/guests";
import { Button } from "@/components/ui/button";

const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;
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
  expectedGuests?: number;
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

  const downloadTemplate = useCallback(() => {
    // Create template data with example rows
    const templateData = [
      {
        "שם / Name": "ישראל ישראלי",
        "טלפון / Phone": "0501234567",
        "צד / Side": "חתן",
        "קבוצה / Group": "משפחה",
        "מספר אורחים / Guests": 2,
        "הערות / Notes": ""
      },
      {
        "שם / Name": "שרה כהן",
        "טלפון / Phone": "0529876543",
        "צד / Side": "כלה",
        "קבוצה / Group": "חברים",
        "מספר אורחים / Guests": 1,
        "הערות / Notes": ""
      },
      {
        "שם / Name": "David Smith",
        "טלפון / Phone": "+1234567890",
        "צד / Side": "both",
        "קבוצה / Group": "work",
        "מספר אורחים / Guests": 3,
        "הערות / Notes": "VIP guest"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 20 }, // Name
      { wch: 15 }, // Phone
      { wch: 12 }, // Side
      { wch: 12 }, // Group
      { wch: 18 }, // Guests
      { wch: 20 }, // Notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guests");

    // Generate and download
    XLSX.writeFile(workbook, "guests-template.xlsx");
  }, []);

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
          // Try to find columns by common names (Hebrew, English, and bilingual from template)
          const nameCol = row["שם / Name"] || row["name"] || row["Name"] || row["שם"] || row["שם מלא"];
          const phoneCol = row["טלפון / Phone"] || row["phone"] || row["Phone"] || row["phoneNumber"] || row["טלפון"];
          const emailCol = row["email"] || row["Email"] || row["אימייל"];
          const sideCol = row["צד / Side"] || row["side"] || row["Side"] || row["צד"];
          const groupCol = row["קבוצה / Group"] || row["group"] || row["Group"] || row["groupName"] || row["קבוצה"];
          const expectedGuestsCol = row["מספר אורחים / Guests"] || row["expectedGuests"] || row["Expected Guests"] || row["guests"] || row["מספר אורחים"] || row["כמות"];
          const notesCol = row["הערות / Notes"] || row["notes"] || row["Notes"] || row["הערות"];

          // Map side values
          let side: "bride" | "groom" | "both" | undefined;
          const sideValue = String(sideCol || "").toLowerCase();
          if (sideValue.includes("bride") || sideValue.includes("כלה")) side = "bride";
          else if (sideValue.includes("groom") || sideValue.includes("חתן")) side = "groom";
          else if (sideValue.includes("both") || sideValue.includes("משותף")) side = "both";

          // Map group values
          let groupName: string | undefined;
          const groupValue = String(groupCol || "").toLowerCase();
          if (groupValue.includes("family") || groupValue.includes("משפחה")) groupName = "family";
          else if (groupValue.includes("friend") || groupValue.includes("חבר")) groupName = "friends";
          else if (groupValue.includes("work") || groupValue.includes("עבודה")) groupName = "work";
          else if (groupValue.includes("other") || groupValue.includes("אחר")) groupName = "other";
          else if (groupCol) groupName = String(groupCol).trim();

          // Parse expected guests
          const expectedGuests = expectedGuestsCol ? parseInt(String(expectedGuestsCol), 10) : undefined;

          return {
            name: String(nameCol || "").trim(),
            phoneNumber: phoneCol ? String(phoneCol).trim() : undefined,
            email: emailCol ? String(emailCol).trim() : undefined,
            side,
            groupName,
            expectedGuests: expectedGuests && !isNaN(expectedGuests) && expectedGuests > 0 ? expectedGuests : 1,
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("import")}</DialogTitle>
          <DialogDescription>
            {t("importInstructions")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("downloadTemplate")}</p>
              <p className="text-xs text-muted-foreground">{t("downloadTemplateDescription")}</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Icons.download className="me-2 h-4 w-4" />
              {t("downloadTemplate")}
            </Button>
          </div>

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
                      <th className="p-2 text-start">{t("side")}</th>
                      <th className="p-2 text-start">{t("group")}</th>
                      <th className="p-2 text-start">{t("guestCount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedGuests.slice(0, 10).map((guest, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{guest.name}</td>
                        <td className="p-2">{guest.phoneNumber || "-"}</td>
                        <td className="p-2">{guest.side ? t(`sides.${guest.side}` as "sides.bride" | "sides.groom" | "sides.both") : "-"}</td>
                        <td className="p-2">{guest.groupName
                          ? (PREDEFINED_GROUPS.includes(guest.groupName as typeof PREDEFINED_GROUPS[number])
                              ? t(`groups.${guest.groupName}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
                              : guest.groupName)
                          : "-"}</td>
                        <td className="p-2">{guest.expectedGuests || 1}</td>
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
