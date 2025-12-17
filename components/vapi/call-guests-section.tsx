"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { callGuest, startBulkCalling, getGuestsForCalling } from "@/actions/vapi/calls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/shared/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  rsvp?: {
    status: string;
    guestCount: number | null;
  } | null;
}

interface CallGuestsSectionProps {
  eventId: string;
  isEnabled: boolean;
  hasSyncedData: boolean;
  onCallsStarted: () => void;
}

export function CallGuestsSection({
  eventId,
  isEnabled,
  hasSyncedData,
  onCallsStarted,
}: CallGuestsSectionProps) {
  const t = useTranslations("voiceAgent.calls");
  const tc = useTranslations("common");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "pending" | "no_phone">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isCalling, setIsCalling] = useState(false);
  const [callingGuestId, setCallingGuestId] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Load guests
  useEffect(() => {
    loadGuests();
  }, [eventId]);

  const loadGuests = async () => {
    setIsLoading(true);
    try {
      const result = await getGuestsForCalling(eventId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.guests) {
        setGuests(result.guests);
      }
    } catch {
      toast.error("Failed to load guests");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter guests
  const filteredGuests = guests.filter((guest) => {
    if (filter === "no_phone") return !guest.phoneNumber;
    if (filter === "pending") {
      return guest.phoneNumber && (!guest.rsvp || guest.rsvp.status === "PENDING");
    }
    return guest.phoneNumber;
  });

  const guestsWithPhone = guests.filter((g) => g.phoneNumber);
  const pendingGuests = guestsWithPhone.filter(
    (g) => !g.rsvp || g.rsvp.status === "PENDING"
  );

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(filteredGuests.map((g) => g.id)));
    }
  };

  const handleSelectGuest = (guestId: string) => {
    const newSelected = new Set(selectedGuests);
    if (newSelected.has(guestId)) {
      newSelected.delete(guestId);
    } else {
      newSelected.add(guestId);
    }
    setSelectedGuests(newSelected);
  };

  // Call single guest
  const handleCallGuest = async (guestId: string) => {
    setCallingGuestId(guestId);
    try {
      const result = await callGuest(guestId, eventId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("callStarted"));
        onCallsStarted();
        window.dispatchEvent(new CustomEvent("voice-agent-data-changed"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setCallingGuestId(null);
    }
  };

  // Bulk call
  const handleBulkCall = async () => {
    setShowBulkConfirm(false);
    setIsCalling(true);
    try {
      const result = await startBulkCalling(eventId, Array.from(selectedGuests));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("bulkCallStarted", { count: result.totalGuests || 0 }));
        setSelectedGuests(new Set());
        onCallsStarted();
        window.dispatchEvent(new CustomEvent("voice-agent-data-changed"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setIsCalling(false);
    }
  };

  // Quick select all pending
  const handleSelectAllPending = () => {
    setSelectedGuests(new Set(pendingGuests.map((g) => g.id)));
  };

  // Disabled state render
  if (!isEnabled) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-5 border-b">
          <h3 className="text-base font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="p-5">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mb-4">
              <Icons.alertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <p>{t("disabled")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSyncedData) {
    return (
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-5 border-b">
          <h3 className="text-base font-semibold">{t("title")}</h3>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <div className="p-5">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center mb-4">
              <Icons.database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <p>{t("needsSync")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="p-5 border-b">
        <h3 className="text-base font-semibold">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <Icons.users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{guests.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("totalGuests")}</p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <Icons.phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{guestsWithPhone.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("withPhone")}</p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                <Icons.clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingGuests.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("pendingRsvp")}</p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                <Icons.check className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{selectedGuests.size}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("selected")}</p>
          </div>
        </div>

        {/* Filter and Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("pending")}
              className={filter === "pending" ? "bg-background shadow-sm" : ""}
            >
              {t("filterPending")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-background shadow-sm" : ""}
            >
              {t("filterAll")}
            </Button>
          </div>

          <div className="flex-1" />

          {pendingGuests.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleSelectAllPending}>
              {t("selectAllPending")}
            </Button>
          )}

          <Button
            onClick={() => setShowBulkConfirm(true)}
            disabled={selectedGuests.size === 0 || isCalling}
          >
            {isCalling ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {t("calling")}
              </>
            ) : (
              <>
                <Icons.phone className="mr-2 h-4 w-4" />
                {t("callSelected", { count: selectedGuests.size })}
              </>
            )}
          </Button>
        </div>

        {/* Guest Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Icons.users className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p>{t("noGuests")}</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                  <TableRow>
                    <TableHead className="w-[8%]">
                      <Checkbox
                        checked={filteredGuests.length > 0 && selectedGuests.size === filteredGuests.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[27%]">{t("guestName")}</TableHead>
                    <TableHead className="w-[25%]">{t("phone")}</TableHead>
                    <TableHead className="w-[25%]">{t("rsvpStatus")}</TableHead>
                    <TableHead className="w-[15%]">{t("action")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGuests.map((guest) => (
                    <TableRow
                      key={guest.id}
                      className={selectedGuests.has(guest.id) ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedGuests.has(guest.id)}
                          onCheckedChange={() => handleSelectGuest(guest.id)}
                          disabled={!guest.phoneNumber}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell>
                        {guest.phoneNumber ? (
                          <span className="font-mono text-sm text-muted-foreground">{guest.phoneNumber}</span>
                        ) : (
                          <span className="text-muted-foreground/50 text-sm">{t("noPhone")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {guest.rsvp ? (
                          <Badge
                            variant={
                              guest.rsvp.status === "ACCEPTED"
                                ? "default"
                                : guest.rsvp.status === "DECLINED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {guest.rsvp.status}
                            {guest.rsvp.guestCount && ` (${guest.rsvp.guestCount})`}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t("pending")}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {guest.phoneNumber && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCallGuest(guest.id)}
                            disabled={callingGuestId === guest.id}
                            className="h-8 w-8 p-0"
                          >
                            {callingGuestId === guest.id ? (
                              <Icons.spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              <Icons.phone className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Bulk Call Modal */}
        <Dialog open={showBulkConfirm} onOpenChange={setShowBulkConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <Icons.phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                {t("bulkConfirmTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("bulkConfirmDescription", { count: selectedGuests.size })}
              </DialogDescription>
            </DialogHeader>

            {/* Selected Guests List */}
            <div className="py-4">
              <p className="text-sm font-medium mb-3">{t("selectedGuests")}</p>
              <ScrollArea className="h-[200px] rounded-lg border bg-muted/30 p-3">
                <div className="space-y-2">
                  {guests
                    .filter((g) => selectedGuests.has(g.id))
                    .map((guest) => (
                      <div
                        key={guest.id}
                        className="flex items-center justify-between rounded-md border bg-card p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                            <Icons.user className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{guest.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {guest.phoneNumber}
                            </p>
                          </div>
                        </div>
                        {guest.rsvp && (
                          <Badge
                            variant={
                              guest.rsvp.status === "ACCEPTED"
                                ? "default"
                                : guest.rsvp.status === "DECLINED"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {guest.rsvp.status}
                          </Badge>
                        )}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowBulkConfirm(false)}>
                {tc("cancel")}
              </Button>
              <Button onClick={handleBulkCall} disabled={isCalling}>
                {isCalling ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    {t("calling")}
                  </>
                ) : (
                  <>
                    <Icons.phone className="mr-2 h-4 w-4" />
                    {t("startCalling")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
