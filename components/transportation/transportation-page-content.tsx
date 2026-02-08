"use client";

import { useState, useMemo, useTransition } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  Copy, Check, MapPin, Phone, User, Calendar,
  Filter, Download, Settings, Plus, Edit2,
  Trash2, ChevronDown, ChevronUp, MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";

import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { absoluteUrl } from "@/lib/utils";
import {
  createPickupPlace,
  updatePickupPlace,
  deletePickupPlace,
  togglePickupPlaceStatus,
  toggleTransportationEnabled
} from "@/actions/transportation";

interface PickupPlace {
  id: string;
  name: string;
  nameHe: string | null;
  nameEn: string | null;
  nameAr: string | null;
  address: string | null;
  notes: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: {
    registrations: number;
  };
}

interface TransportationRegistration {
  id: string;
  fullName: string;
  phoneNumber: string;
  location: string;
  quantity: number;
  notes: string | null;
  registeredAt: Date | string;
  pickupPlaceId: string | null;
  guest: {
    id: string;
    name: string;
    phoneNumber: string | null;
    email: string | null;
    slug: string;
    transportationSlug: string | null;
    side: string | null;
    groupName: string | null;
  } | null;
  pickupPlace: {
    id: string;
    name: string;
    nameHe: string | null;
    nameEn: string | null;
    nameAr: string | null;
    address: string | null;
  } | null;
}

// Extend EventOption to include transportationEnabled
interface ExtendedEventOption extends EventOption {
  transportationEnabled?: boolean;
}

interface TransportationPageContentProps {
  eventId: string;
  events: ExtendedEventOption[];
  locale: string;
  transportationRegistrations: TransportationRegistration[];
  pickupPlaces: PickupPlace[];
}

export function TransportationPageContent({
  eventId,
  events,
  locale,
  transportationRegistrations,
  pickupPlaces: initialPickupPlaces,
}: TransportationPageContentProps) {
  const isRTL = locale === "he";
  const [isPending, startTransition] = useTransition();

  // Get current event
  const currentEvent = events.find((e) => e.id === eventId);

  // State
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [copiedGeneric, setCopiedGeneric] = useState(false);
  const [filterPickupPlace, setFilterPickupPlace] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [transportationEnabled, setTransportationEnabled] = useState(currentEvent?.transportationEnabled ?? true);

  // Pickup place management
  const [pickupPlaces, setPickupPlaces] = useState(initialPickupPlaces);
  const [showPickupPlaceDialog, setShowPickupPlaceDialog] = useState(false);
  const [editingPickupPlace, setEditingPickupPlace] = useState<PickupPlace | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [placeToDelete, setPlaceToDelete] = useState<string | null>(null);

  // Guest management
  const [showEditGuestDialog, setShowEditGuestDialog] = useState(false);
  const [editingGuest, setEditingGuest] = useState<TransportationRegistration | null>(null);
  const [showDeleteGuestDialog, setShowDeleteGuestDialog] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<string | null>(null);

  // Form state for pickup places
  const [placeName, setPlaceName] = useState("");
  const [placeNameHe, setPlaceNameHe] = useState("");
  const [placeNameEn, setPlaceNameEn] = useState("");
  const [placeNameAr, setPlaceNameAr] = useState("");
  const [placeAddress, setPlaceAddress] = useState("");
  const [placeNotes, setPlaceNotes] = useState("");
  const [placeIsActive, setPlaceIsActive] = useState(true);

  // Form state for guest edit
  const [guestFullName, setGuestFullName] = useState("");
  const [guestPhoneNumber, setGuestPhoneNumber] = useState("");
  const [guestPickupPlaceId, setGuestPickupPlaceId] = useState("");
  const [guestLocation, setGuestLocation] = useState("");
  const [guestNotes, setGuestNotes] = useState("");

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    return transportationRegistrations.filter((reg) => {
      // Filter by pickup place
      if (filterPickupPlace !== "all") {
        if (filterPickupPlace === "none" && reg.pickupPlaceId !== null) return false;
        if (filterPickupPlace !== "none" && reg.pickupPlaceId !== filterPickupPlace) return false;
      }

      // Filter by type
      if (filterType !== "all") {
        if (filterType === "guest" && !reg.guest) return false;
        if (filterType === "generic" && reg.guest) return false;
      }

      return true;
    });
  }, [transportationRegistrations, filterPickupPlace, filterType]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = transportationRegistrations.length;
    const byPickupPlace: Record<string, number> = {};
    const guestRegistrations = transportationRegistrations.filter(r => r.guest).length;
    const genericRegistrations = total - guestRegistrations;

    transportationRegistrations.forEach((reg) => {
      const placeKey = reg.pickupPlaceId || "none";
      byPickupPlace[placeKey] = (byPickupPlace[placeKey] || 0) + 1;
    });

    return { total, byPickupPlace, guestRegistrations, genericRegistrations };
  }, [transportationRegistrations]);

  const handleCopyLink = async (slug: string) => {
    const link = absoluteUrl(`/transportation/${slug}`);
    await navigator.clipboard.writeText(link);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleCopyGenericLink = async () => {
    const link = absoluteUrl(`/transportation/event/${eventId}`);
    await navigator.clipboard.writeText(link);
    setCopiedGeneric(true);
    setTimeout(() => setCopiedGeneric(false), 2000);
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Phone", "Pickup Place", "Location", "Notes", "Type", "Registered At"].join(","),
      ...filteredRegistrations.map((reg) => {
        const registeredDate = typeof reg.registeredAt === 'string' ? new Date(reg.registeredAt) : reg.registeredAt;
        return [
          reg.fullName,
          reg.phoneNumber,
          reg.pickupPlace?.name || "-",
          reg.location,
          reg.notes || "-",
          reg.guest ? "Guest" : "Generic",
          format(registeredDate, "PPp"),
        ].map(field => `"${field}"`).join(",");
      })
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transportation-registrations-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(isRTL ? "הקובץ ירד בהצלחה" : "File downloaded successfully");
  };

  const handleToggleTransportationEnabled = async (enabled: boolean) => {
    startTransition(async () => {
      const result = await toggleTransportationEnabled(eventId, enabled);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setTransportationEnabled(enabled);
      toast.success(
        enabled
          ? (isRTL ? "ההרשמה להסעות הופעלה" : "Transportation registration enabled")
          : (isRTL ? "ההרשמה להסעות הושבתה" : "Transportation registration disabled")
      );
    });
  };

  const openCreateDialog = () => {
    setEditingPickupPlace(null);
    setPlaceName("");
    setPlaceNameHe("");
    setPlaceNameEn("");
    setPlaceNameAr("");
    setPlaceAddress("");
    setPlaceNotes("");
    setPlaceIsActive(true);
    setShowPickupPlaceDialog(true);
  };

  const openEditDialog = (place: PickupPlace) => {
    setEditingPickupPlace(place);
    setPlaceName(place.name);
    setPlaceNameHe(place.nameHe || "");
    setPlaceNameEn(place.nameEn || "");
    setPlaceNameAr(place.nameAr || "");
    setPlaceAddress(place.address || "");
    setPlaceNotes(place.notes || "");
    setPlaceIsActive(place.isActive);
    setShowPickupPlaceDialog(true);
  };

  const handleSavePickupPlace = async () => {
    if (!placeName.trim()) {
      toast.error(isRTL ? "שם נקודת האיסוף חובה" : "Pickup place name is required");
      return;
    }

    startTransition(async () => {
      try {
        if (editingPickupPlace) {
          const result = await updatePickupPlace({
            id: editingPickupPlace.id,
            name: placeName,
            nameHe: placeNameHe || undefined,
            nameEn: placeNameEn || undefined,
            nameAr: placeNameAr || undefined,
            address: placeAddress || undefined,
            notes: placeNotes || undefined,
            sortOrder: editingPickupPlace.sortOrder,
            isActive: placeIsActive,
          });

          if (result.error) {
            toast.error(result.error);
            return;
          }

          setPickupPlaces(prev => prev.map(p =>
            p.id === editingPickupPlace.id
              ? { ...p, ...result.pickupPlace, _count: p._count }
              : p
          ));
          toast.success(isRTL ? "נקודת האיסוף עודכנה בהצלחה" : "Pickup place updated successfully");
        } else {
          const result = await createPickupPlace({
            eventId,
            name: placeName,
            nameHe: placeNameHe || undefined,
            nameEn: placeNameEn || undefined,
            nameAr: placeNameAr || undefined,
            address: placeAddress || undefined,
            notes: placeNotes || undefined,
            sortOrder: pickupPlaces.length,
          });

          if (result.error) {
            toast.error(result.error);
            return;
          }

          setPickupPlaces(prev => [...prev, { ...result.pickupPlace!, _count: { registrations: 0 } }]);
          toast.success(isRTL ? "נקודת איסוף נוצרה בהצלחה" : "Pickup place created successfully");
        }

        setShowPickupPlaceDialog(false);
      } catch (error) {
        toast.error(isRTL ? "שגיאה בשמירת נקודת האיסוף" : "Error saving pickup place");
      }
    });
  };

  const handleToggleStatus = async (place: PickupPlace) => {
    startTransition(async () => {
      const result = await togglePickupPlaceStatus(place.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setPickupPlaces(prev => prev.map(p =>
        p.id === place.id
          ? { ...p, isActive: !p.isActive }
          : p
      ));

      toast.success(isRTL ? "הסטטוס עודכן" : "Status updated");
    });
  };

  const handleDeleteConfirm = async () => {
    if (!placeToDelete) return;

    startTransition(async () => {
      const result = await deletePickupPlace(placeToDelete);

      if (result.error) {
        toast.error(result.error);
        setShowDeleteDialog(false);
        return;
      }

      setPickupPlaces(prev => prev.filter(p => p.id !== placeToDelete));
      toast.success(isRTL ? "נקודת האיסוף נמחקה" : "Pickup place deleted");
      setShowDeleteDialog(false);
      setPlaceToDelete(null);
    });
  };

  const openEditGuestDialog = (registration: TransportationRegistration) => {
    setEditingGuest(registration);
    setGuestFullName(registration.fullName);
    setGuestPhoneNumber(registration.phoneNumber);
    setGuestPickupPlaceId(registration.pickupPlaceId || "");
    setGuestLocation(registration.location);
    setGuestNotes(registration.notes || "");
    setShowEditGuestDialog(true);
  };

  const handleSaveGuest = async () => {
    // TODO: Implement update guest registration action
    toast.info(isRTL ? "בקרוב..." : "Coming soon...");
  };

  const handleDeleteGuestConfirm = async () => {
    // TODO: Implement delete guest registration action
    toast.info(isRTL ? "בקרוב..." : "Coming soon...");
  };

  const getPickupPlaceName = (place: PickupPlace | null, lang: string = locale) => {
    if (!place) return isRTL ? "ללא נקודת איסוף" : "No pickup place";

    if (lang === "he" && place.nameHe) return place.nameHe;
    if (lang === "en" && place.nameEn) return place.nameEn;
    if (lang === "ar" && place.nameAr) return place.nameAr;

    return place.name;
  };

  const getSideLabel = (side: string | null | undefined) => {
    if (!side) return null;
    const sideLabels: Record<string, string> = isRTL
      ? { bride: "כלה", groom: "חתן", both: "שניהם" }
      : { bride: "Bride", groom: "Groom", both: "Both" };
    return sideLabels[side.toLowerCase()] || side;
  };

  const getGroupLabel = (group: string | null | undefined) => {
    if (!group) return null;
    const groupLabels: Record<string, string> = isRTL
      ? { family: "משפחה", friends: "חברים", work: "עבודה", other: "אחר" }
      : { family: "Family", friends: "Friends", work: "Work", other: "Other" };
    return groupLabels[group.toLowerCase()] || group;
  };

  return (
    <PageFadeIn className="md:h-full space-y-4">
      {/* Header */}
      <div className="shrink-0 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isRTL ? "הסעות" : "Transportation"}
          </h1>
          <p className="text-muted-foreground">
            {isRTL ? "ניהול הרשמות להסעות ונקודות איסוף" : "Manage transportation registrations and pickup places"}
          </p>
        </div>
        <EventDropdownSelector
          events={events}
          selectedEventId={eventId}
          locale={locale}
          basePath={`/${locale}/dashboard/events/${eventId}/transportation`}
        />
      </div>

      {/* Transportation Toggle */}
      <Card className="shrink-0 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="transportation-toggle" className="text-base font-medium">
                {isRTL ? "אפשר הרשמה להסעות" : "Enable Transportation Registration"}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isRTL
                  ? "כאשר כבוי, אורחים לא יוכלו להירשם להסעות דרך הקישור"
                  : "When disabled, guests cannot register for transportation via the link"}
              </p>
            </div>
            <Switch
              id="transportation-toggle"
              checked={transportationEnabled}
              onCheckedChange={handleToggleTransportationEnabled}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="shrink-0 grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "סה״כ נרשמים" : "Total Registrations"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "אורחים / כלליות" : "Guest / Generic"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <span className="text-primary">{stats.guestRegistrations}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-blue-600">{stats.genericRegistrations}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isRTL ? "נקודות איסוף" : "Pickup Places"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pickupPlaces.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row gap-3 mb-6">
        <Button
          variant="outline"
          onClick={handleCopyGenericLink}
          className="gap-2"
        >
          {copiedGeneric ? (
            <>
              <Check className="h-4 w-4" />
              {isRTL ? "הועתק" : "Copied"}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {isRTL ? "העתק קישור כללי" : "Copy Generic Link"}
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={handleExport}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {isRTL ? "ייצוא לאקסל" : "Export to CSV"}
        </Button>

        <Button
          variant="default"
          onClick={openCreateDialog}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {isRTL ? "הוסף נקודת איסוף" : "Add Pickup Place"}
        </Button>
      </div>

      {/* Filters */}
      <Card className="shrink-0 mb-6">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {isRTL ? "סינון" : "Filters"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>{isRTL ? "נקודת איסוף" : "Pickup Place"}</Label>
              <Select value={filterPickupPlace} onValueChange={setFilterPickupPlace}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "הכל" : "All"}</SelectItem>
                  <SelectItem value="none">{isRTL ? "ללא נקודת איסוף" : "No pickup place"}</SelectItem>
                  {pickupPlaces.map((place) => (
                    <SelectItem key={place.id} value={place.id}>
                      {getPickupPlaceName(place)} ({stats.byPickupPlace[place.id] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "סוג" : "Type"}</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? "הכל" : "All"}</SelectItem>
                  <SelectItem value="guest">{isRTL ? "אורחים" : "Guests"} ({stats.guestRegistrations})</SelectItem>
                  <SelectItem value="generic">{isRTL ? "כלליות" : "Generic"} ({stats.genericRegistrations})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pickup Places Management */}
      {pickupPlaces.length > 0 && (
        <Card className="shrink-0 mb-6">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {isRTL ? "ניהול נקודות איסוף" : "Manage Pickup Places"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pickupPlaces.map((place) => (
                <div
                  key={place.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                  dir={isRTL ? "rtl" : "ltr"}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getPickupPlaceName(place)}</span>
                      {!place.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          {isRTL ? "לא פעיל" : "Inactive"}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {place._count.registrations} {isRTL ? "נרשמים" : "registrations"}
                      </Badge>
                    </div>
                    {place.address && (
                      <p className="text-xs text-muted-foreground mt-1">{place.address}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(place)}
                      disabled={isPending}
                    >
                      <Switch checked={place.isActive} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(place)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPlaceToDelete(place.id);
                        setShowDeleteDialog(true);
                      }}
                      disabled={place._count.registrations > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registrations Table */}
      <div className="md:min-h-[500px] md:flex-1 min-h-0">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>
              {isRTL ? "רשימת נרשמים" : "Registration List"}
            </CardTitle>
            <CardDescription>
              {isRTL ? `מציג ${filteredRegistrations.length} מתוך ${transportationRegistrations.length} נרשמים` : `Showing ${filteredRegistrations.length} of ${transportationRegistrations.length} registrations`}
            </CardDescription>
          </CardHeader>
          <CardContent>
          {filteredRegistrations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icons.bus className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {isRTL ? "אין נרשמים תואמים" : "No matching registrations"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {isRTL
                  ? "נסה לשנות את הפילטרים או שלח הודעות WhatsApp לאורחים"
                  : "Try changing your filters or send WhatsApp messages to your guests"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                      {isRTL ? "שם" : "Name"}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                      {isRTL ? "טלפון" : "Phone"}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                      {isRTL ? "כמות" : "Quantity"}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                      {isRTL ? "נקודת איסוף" : "Pickup Place"}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                      {isRTL ? "מיקום" : "Location"}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                      {isRTL ? "סוג" : "Type"}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                      {isRTL ? "תאריך" : "Registered"}
                    </TableHead>
                    <TableHead className={isRTL ? "text-right" : "text-left"}>
                      {isRTL ? "פעולות" : "Actions"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((registration) => {
                    const registeredDate = typeof registration.registeredAt === 'string'
                      ? new Date(registration.registeredAt)
                      : registration.registeredAt;

                    return (
                      <TableRow key={registration.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{registration.fullName}</span>
                            {registration.guest && (
                              <div className="flex gap-1 mt-1">
                                {registration.guest.side && (
                                  <Badge variant="secondary" className="text-xs">
                                    {getSideLabel(registration.guest.side)}
                                  </Badge>
                                )}
                                {registration.guest.groupName && (
                                  <Badge variant="outline" className="text-xs">
                                    {getGroupLabel(registration.guest.groupName)}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{registration.phoneNumber}</TableCell>
                        <TableCell className="text-center font-medium">
                          {registration.quantity}
                        </TableCell>
                        <TableCell>
                          {registration.pickupPlace ? (
                            <div>
                              <div className="font-medium">{registration.pickupPlace.name}</div>
                              {registration.pickupPlace.address && (
                                <div className="text-xs text-muted-foreground">{registration.pickupPlace.address}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">
                              {isRTL ? "ללא" : "None"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{registration.location}</TableCell>
                        <TableCell>
                          {registration.guest ? (
                            <Badge variant="default" className="text-xs">
                              {isRTL ? "אורח" : "Guest"}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {isRTL ? "כללי" : "Generic"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(registeredDate, "dd/MM/yy HH:mm", { locale: isRTL ? he : undefined })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? "start" : "end"}>
                              {registration.guest?.transportationSlug && (
                                <>
                                  <DropdownMenuItem onClick={() => handleCopyLink(registration.guest!.transportationSlug!)}>
                                    <Copy className="h-4 w-4 me-2" />
                                    {isRTL ? "העתק קישור" : "Copy Link"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => openEditGuestDialog(registration)}>
                                <Edit2 className="h-4 w-4 me-2" />
                                {isRTL ? "ערוך" : "Edit"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setGuestToDelete(registration.id);
                                  setShowDeleteGuestDialog(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 me-2" />
                                {isRTL ? "מחק" : "Delete"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        </Card>
      </div>

      {/* Pickup Place Dialog */}
      <Dialog open={showPickupPlaceDialog} onOpenChange={setShowPickupPlaceDialog}>
        <DialogContent className="max-w-2xl" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {editingPickupPlace
                ? (isRTL ? "עריכת נקודת איסוף" : "Edit Pickup Place")
                : (isRTL ? "נקודת איסוף חדשה" : "New Pickup Place")}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? "הגדר נקודת איסוף עם תרגומים למספר שפות"
                : "Configure a pickup place with translations in multiple languages"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{isRTL ? "שם (ברירת מחדל)" : "Name (Default)"} *</Label>
              <Input
                id="name"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder={isRTL ? "למשל: תחנה מרכזית" : "e.g., Central Station"}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="nameHe">🇮🇱 {isRTL ? "שם בעברית" : "Hebrew Name"}</Label>
                <Input
                  id="nameHe"
                  value={placeNameHe}
                  onChange={(e) => setPlaceNameHe(e.target.value)}
                  placeholder={isRTL ? "תחנה מרכזית" : "תחנה מרכזית"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameEn">🇬🇧 {isRTL ? "שם באנגלית" : "English Name"}</Label>
                <Input
                  id="nameEn"
                  value={placeNameEn}
                  onChange={(e) => setPlaceNameEn(e.target.value)}
                  placeholder="Central Station"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameAr">🇸🇦 {isRTL ? "שם בערבית" : "Arabic Name"}</Label>
                <Input
                  id="nameAr"
                  value={placeNameAr}
                  onChange={(e) => setPlaceNameAr(e.target.value)}
                  placeholder="المحطة المركزية"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{isRTL ? "כתובת" : "Address"}</Label>
              <Input
                id="address"
                value={placeAddress}
                onChange={(e) => setPlaceAddress(e.target.value)}
                placeholder={isRTL ? "כתובת מלאה" : "Full address"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{isRTL ? "הערות פנימיות" : "Internal Notes"}</Label>
              <Textarea
                id="notes"
                value={placeNotes}
                onChange={(e) => setPlaceNotes(e.target.value)}
                placeholder={isRTL ? "הערות למנהל האירוע" : "Notes for event manager"}
                rows={3}
              />
            </div>

            {editingPickupPlace && (
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={placeIsActive}
                  onCheckedChange={setPlaceIsActive}
                />
                <Label htmlFor="active">
                  {isRTL ? "נקודת איסוף פעילה" : "Active pickup place"}
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPickupPlaceDialog(false)}>
              {isRTL ? "ביטול" : "Cancel"}
            </Button>
            <Button onClick={handleSavePickupPlace} disabled={isPending}>
              {isPending
                ? (isRTL ? "שומר..." : "Saving...")
                : (isRTL ? "שמור" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pickup Place Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "למחוק נקודת איסוף?" : "Delete pickup place?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? "פעולה זו תמחק את נקודת האיסוף לצמיתות. פעולה זו לא ניתנת לביטול."
                : "This will permanently delete the pickup place. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "ביטול" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRTL ? "מחק" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Guest Dialog */}
      <Dialog open={showEditGuestDialog} onOpenChange={setShowEditGuestDialog}>
        <DialogContent dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>
              {isRTL ? "עריכת פרטי נרשם" : "Edit Registration"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{isRTL ? "שם מלא" : "Full Name"}</Label>
              <Input
                value={guestFullName}
                onChange={(e) => setGuestFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "טלפון" : "Phone Number"}</Label>
              <Input
                value={guestPhoneNumber}
                onChange={(e) => setGuestPhoneNumber(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "נקודת איסוף" : "Pickup Place"}</Label>
              <Select value={guestPickupPlaceId || "none"} onValueChange={(val) => setGuestPickupPlaceId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? "בחר נקודת איסוף" : "Select pickup place"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{isRTL ? "ללא" : "None"}</SelectItem>
                  {pickupPlaces.map((place) => (
                    <SelectItem key={place.id} value={place.id}>
                      {getPickupPlaceName(place)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "מיקום" : "Location"}</Label>
              <Input
                value={guestLocation}
                onChange={(e) => setGuestLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{isRTL ? "הערות" : "Notes"}</Label>
              <Textarea
                value={guestNotes}
                onChange={(e) => setGuestNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditGuestDialog(false)}>
              {isRTL ? "ביטול" : "Cancel"}
            </Button>
            <Button onClick={handleSaveGuest} disabled={isPending}>
              {isRTL ? "שמור" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Guest Dialog */}
      <AlertDialog open={showDeleteGuestDialog} onOpenChange={setShowDeleteGuestDialog}>
        <AlertDialogContent dir={isRTL ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "למחוק נרשם?" : "Delete registration?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? "פעולה זו תמחק את ההרשמה לצמיתות. פעולה זו לא ניתנת לביטול."
                : "This will permanently delete this registration. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "ביטול" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGuestConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRTL ? "מחק" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageFadeIn>
  );
}
