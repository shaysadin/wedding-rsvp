"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { GiftPaymentStatus } from "@prisma/client";

import { deleteGift, addManualGift, updateGiftPaymentSettings } from "@/actions/gift-payments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface Gift {
  id: string;
  amount: number;
  currency: string;
  serviceFee: number;
  totalCharged: number;
  message: string | null;
  status: GiftPaymentStatus;
  isManual: boolean;
  guestName: string | null;
  createdAt: string;
  paidAt: string | null;
}

interface GiftSettings {
  id: string;
  isEnabled: boolean;
  minAmount: number;
  maxAmount: number;
  suggestedAmounts: number[];
  currency: string;
  useExternalProvider?: boolean;
  externalProviderUrl?: string | null;
}

interface GiftsDashboardProps {
  eventId: string;
  gifts: Gift[];
  settings: GiftSettings | null;
  onRefresh: () => void;
}

export function GiftsDashboard({
  eventId,
  gifts,
  settings,
  onRefresh,
}: GiftsDashboardProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New gift form
  const [newGift, setNewGift] = useState({
    guestName: "",
    amount: "",
    message: "",
  });

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    isEnabled: settings?.isEnabled ?? false,
    minAmount: settings?.minAmount ?? 50,
    maxAmount: settings?.maxAmount ?? 5000,
    suggestedAmounts: settings?.suggestedAmounts?.join(", ") ?? "400, 500, 800, 1000",
    currency: settings?.currency ?? "ILS",
    useExternalProvider: settings?.useExternalProvider ?? false,
    externalProviderUrl: settings?.externalProviderUrl ?? "",
  });

  // Sync form state when settings prop changes (e.g., after refresh)
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        isEnabled: settings.isEnabled ?? false,
        minAmount: settings.minAmount ?? 50,
        maxAmount: settings.maxAmount ?? 5000,
        suggestedAmounts: settings.suggestedAmounts?.join(", ") ?? "400, 500, 800, 1000",
        currency: settings.currency ?? "ILS",
        useExternalProvider: settings.useExternalProvider ?? false,
        externalProviderUrl: settings.externalProviderUrl ?? "",
      });
    }
  }, [settings]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Stats
  const totalGifts = gifts.length;
  const completedGifts = gifts.filter((g) => g.status === "COMPLETED");
  const totalAmount = completedGifts.reduce((sum, g) => sum + g.amount, 0);
  const pendingAmount = gifts
    .filter((g) => g.status === "PENDING" || g.status === "PROCESSING")
    .reduce((sum, g) => sum + g.amount, 0);

  const getStatusBadge = (status: GiftPaymentStatus) => {
    const variants: Record<GiftPaymentStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: { en: string; he: string } }> = {
      PENDING: { variant: "secondary", label: { en: "Pending", he: "ממתין" } },
      PROCESSING: { variant: "outline", label: { en: "Processing", he: "בעיבוד" } },
      COMPLETED: { variant: "default", label: { en: "Completed", he: "הושלם" } },
      FAILED: { variant: "destructive", label: { en: "Failed", he: "נכשל" } },
      REFUNDED: { variant: "outline", label: { en: "Refunded", he: "הוחזר" } },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant}>
        {isRTL ? config.label.he : config.label.en}
      </Badge>
    );
  };

  const handleAddGift = async () => {
    if (!newGift.guestName || !newGift.amount) {
      toast.error(isRTL ? "נא למלא את כל השדות" : "Please fill all required fields");
      return;
    }

    setIsAdding(true);
    try {
      const result = await addManualGift(eventId, {
        guestName: newGift.guestName,
        amount: Number(newGift.amount),
        greetingMessage: newGift.message || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "המתנה נוספה בהצלחה" : "Gift added successfully");
        setIsAddOpen(false);
        setNewGift({ guestName: "", amount: "", message: "" });
        onRefresh();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בהוספת מתנה" : "Failed to add gift");
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const suggestedAmounts = settingsForm.suggestedAmounts
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      const result = await updateGiftPaymentSettings(eventId, {
        isEnabled: settingsForm.isEnabled,
        minAmount: settingsForm.minAmount,
        maxAmount: settingsForm.maxAmount,
        suggestedAmounts,
        currency: settingsForm.currency,
        useExternalProvider: settingsForm.useExternalProvider,
        externalProviderUrl: settingsForm.externalProviderUrl || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההגדרות נשמרו בהצלחה" : "Settings saved successfully");
        setIsSettingsOpen(false);
        onRefresh();
      }
    } catch {
      toast.error(isRTL ? "שגיאה בשמירת הגדרות" : "Failed to save settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      const result = await deleteGift(deleteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "המתנה נמחקה בהצלחה" : "Gift deleted successfully");
        onRefresh();
      }
    } catch {
      toast.error(isRTL ? "שגיאה במחיקת מתנה" : "Failed to delete gift");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "סה״כ מתנות" : "Total Gifts"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGifts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "סה״כ התקבל" : "Total Received"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalAmount, settings?.currency || "ILS")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "ממתין" : "Pending"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(pendingAmount, settings?.currency || "ILS")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "מתנות הושלמו" : "Completed"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedGifts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Icons.add className="h-4 w-4 me-2" />
              {isRTL ? "הוסף מתנה במזומן" : "Add Cash Gift"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isRTL ? "הוספת מתנה במזומן" : "Add Cash Gift"}</DialogTitle>
              <DialogDescription>
                {isRTL ? "רשמו מתנה שהתקבלה במזומן" : "Record a gift received in cash"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>{isRTL ? "שם האורח" : "Guest Name"}</Label>
                <Input
                  value={newGift.guestName}
                  onChange={(e) => setNewGift({ ...newGift, guestName: e.target.value })}
                  placeholder={isRTL ? "שם האורח" : "Guest name"}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "סכום" : "Amount"}</Label>
                <Input
                  type="number"
                  value={newGift.amount}
                  onChange={(e) => setNewGift({ ...newGift, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "הערה (אופציונלי)" : "Note (optional)"}</Label>
                <Textarea
                  value={newGift.message}
                  onChange={(e) => setNewGift({ ...newGift, message: e.target.value })}
                  placeholder={isRTL ? "הערה..." : "Note..."}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {isRTL ? "ביטול" : "Cancel"}
              </Button>
              <Button onClick={handleAddGift} disabled={isAdding}>
                {isAdding && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                {isRTL ? "הוסף" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Icons.settings className="h-4 w-4 me-2" />
              {isRTL ? "הגדרות" : "Settings"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isRTL ? "הגדרות מתנות" : "Gift Settings"}</DialogTitle>
              <DialogDescription>
                {isRTL ? "הגדירו כיצד אורחים יוכלו לשלוח מתנות" : "Configure how guests can send gifts"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-between">
                <Label>{isRTL ? "הפעל תשלומי מתנות" : "Enable Gift Payments"}</Label>
                <Switch
                  checked={settingsForm.isEnabled}
                  onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, isEnabled: checked })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{isRTL ? "סכום מינימום" : "Min Amount"}</Label>
                  <Input
                    type="number"
                    value={settingsForm.minAmount}
                    onChange={(e) => setSettingsForm({ ...settingsForm, minAmount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{isRTL ? "סכום מקסימום" : "Max Amount"}</Label>
                  <Input
                    type="number"
                    value={settingsForm.maxAmount}
                    onChange={(e) => setSettingsForm({ ...settingsForm, maxAmount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? "סכומים מוצעים" : "Suggested Amounts"}</Label>
                <Input
                  value={settingsForm.suggestedAmounts}
                  onChange={(e) => setSettingsForm({ ...settingsForm, suggestedAmounts: e.target.value })}
                  placeholder="400, 500, 800, 1000"
                />
                <p className="text-xs text-muted-foreground">
                  {isRTL ? "הפרידו בפסיקים" : "Separate with commas"}
                </p>
              </div>

              {/* External Provider Section */}
              <div className="border-t pt-4 mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{isRTL ? "השתמש בספק מתנות חיצוני" : "Use External Gift Provider"}</Label>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "הפנה אורחים לקישור חיצוני במקום למערכת שלנו" : "Redirect guests to an external link instead of our system"}
                    </p>
                  </div>
                  <Switch
                    checked={settingsForm.useExternalProvider}
                    onCheckedChange={(checked) => setSettingsForm({ ...settingsForm, useExternalProvider: checked })}
                  />
                </div>
                {settingsForm.useExternalProvider && (
                  <div className="space-y-2">
                    <Label>{isRTL ? "קישור לספק חיצוני" : "External Provider URL"}</Label>
                    <Input
                      type="url"
                      value={settingsForm.externalProviderUrl}
                      onChange={(e) => setSettingsForm({ ...settingsForm, externalProviderUrl: e.target.value })}
                      placeholder="https://example.com/gifts"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "הקישור שיישלח לאורחים בהודעת יום האירוע" : "The link that will be sent to guests in the event day message"}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                {isRTL ? "ביטול" : "Cancel"}
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                {isRTL ? "שמור" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Gifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "רשימת מתנות" : "Gift List"}</CardTitle>
        </CardHeader>
        <CardContent>
          {gifts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icons.gift className="h-12 w-12 mx-auto mb-4" />
              <p>{isRTL ? "אין מתנות עדיין" : "No gifts yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isRTL ? "מאת" : "From"}</TableHead>
                  <TableHead>{isRTL ? "סכום" : "Amount"}</TableHead>
                  <TableHead>{isRTL ? "סטטוס" : "Status"}</TableHead>
                  <TableHead>{isRTL ? "הודעה" : "Message"}</TableHead>
                  <TableHead>{isRTL ? "תאריך" : "Date"}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gifts.map((gift) => (
                  <TableRow key={gift.id}>
                    <TableCell className="font-medium">
                      {gift.guestName || (isRTL ? "אנונימי" : "Anonymous")}
                      {gift.isManual && (
                        <Badge variant="outline" className="ms-2">
                          {isRTL ? "מזומן" : "Cash"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(gift.amount, gift.currency)}</TableCell>
                    <TableCell>{getStatusBadge(gift.status)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {gift.message || "-"}
                    </TableCell>
                    <TableCell>{formatDate(gift.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(gift.id)}
                      >
                        <Icons.trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? "מחיקת מתנה" : "Delete Gift"}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? "האם אתם בטוחים שברצונכם למחוק רשומת מתנה זו?"
                : "Are you sure you want to delete this gift record?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "ביטול" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {isRTL ? "מחק" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
