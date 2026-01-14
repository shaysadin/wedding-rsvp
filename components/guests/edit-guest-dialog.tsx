"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Guest, GuestRsvp, RsvpStatus, NotificationLog, NotificationStatus } from "@prisma/client";

const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;
const PREDEFINED_SIDES = ["bride", "groom", "both"] as const;
const RSVP_STATUSES = ["PENDING", "ACCEPTED", "DECLINED", "MAYBE"] as const;
const MESSAGE_STATUSES = ["PENDING", "SENT", "DELIVERED", "FAILED", "UNDELIVERED"] as const;

import { updateGuest } from "@/actions/guests";
import { updateGuestMessageStatus } from "@/actions/notifications";
import { updateGuestSchema, type UpdateGuestInput } from "@/lib/validations/guest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";

type GuestWithRsvp = Guest & {
  rsvp: GuestRsvp | null;
  notificationLogs?: NotificationLog[];
};

interface EditGuestDialogProps {
  guest: GuestWithRsvp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Get the latest notification status from logs
function getLatestMessageStatus(logs?: NotificationLog[]): NotificationStatus | null {
  if (!logs || logs.length === 0) return null;
  // Sort by createdAt descending and get the first one
  const sorted = [...logs].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted[0]?.status || null;
}

export function EditGuestDialog({ guest, open, onOpenChange }: EditGuestDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const te = useTranslations("errors");
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomGroup, setShowCustomGroup] = useState(false);
  const [customGroupValue, setCustomGroupValue] = useState("");
  const [showCustomSide, setShowCustomSide] = useState(false);
  const [customSideValue, setCustomSideValue] = useState("");
  const [messageStatus, setMessageStatus] = useState<NotificationStatus | null>(null);
  const [initialMessageStatus, setInitialMessageStatus] = useState<NotificationStatus | null>(null);

  const form = useForm<UpdateGuestInput>({
    resolver: zodResolver(updateGuestSchema),
    defaultValues: {
      id: guest.id,
      name: guest.name,
      phoneNumber: guest.phoneNumber || "",
      side: guest.side as "bride" | "groom" | "both" | undefined,
      groupName: guest.groupName || "",
      expectedGuests: guest.expectedGuests || 1,
      notes: guest.notes || "",
      rsvpStatus: guest.rsvp?.status as RsvpStatus | undefined,
      rsvpGuestCount: guest.rsvp?.guestCount || 1,
    },
  });

  // Reset form when guest changes
  useEffect(() => {
    if (open) {
      const isCustomGroup = guest.groupName && !PREDEFINED_GROUPS.includes(guest.groupName as typeof PREDEFINED_GROUPS[number]);
      setShowCustomGroup(!!isCustomGroup);
      setCustomGroupValue(isCustomGroup ? guest.groupName ?? "" : "");

      const isCustomSide = guest.side && !PREDEFINED_SIDES.includes(guest.side as typeof PREDEFINED_SIDES[number]);
      setShowCustomSide(!!isCustomSide);
      setCustomSideValue(isCustomSide ? guest.side ?? "" : "");

      // Initialize message status from notification logs
      const latestStatus = getLatestMessageStatus(guest.notificationLogs);
      setMessageStatus(latestStatus);
      setInitialMessageStatus(latestStatus);

      form.reset({
        id: guest.id,
        name: guest.name,
        phoneNumber: guest.phoneNumber || "",
        side: guest.side as "bride" | "groom" | "both" | undefined,
        groupName: guest.groupName || "",
        expectedGuests: guest.expectedGuests || 1,
        notes: guest.notes || "",
        rsvpStatus: guest.rsvp?.status as RsvpStatus | undefined,
        rsvpGuestCount: guest.rsvp?.guestCount || 1,
      });
    }
  }, [guest, open, form]);

  const onSubmit = async (data: UpdateGuestInput) => {
    setIsLoading(true);

    try {
      // Update guest data
      const result = await updateGuest(data);

      if (result.error) {
        if (result.error === "DUPLICATE_PHONE" && "duplicateNames" in result) {
          const names = (result as { error: string; duplicateNames: string[] }).duplicateNames.join(", ");
          toast.error(t("duplicates.phoneExists", { names }));
        } else {
          toast.error(result.error);
        }
        return;
      }

      // Update message status if it changed
      if (messageStatus !== initialMessageStatus && messageStatus) {
        const statusResult = await updateGuestMessageStatus(guest.id, messageStatus);
        if (statusResult.error) {
          console.error("Failed to update message status:", statusResult.error);
          // Don't fail the whole operation, just log the error
        }
      }

      toast.success(ts("saved"));
      onOpenChange(false);
    } catch (error) {
      toast.error(te("generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("edit")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("name")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("phone")}</FormLabel>
                  <FormControl>
                    <Input placeholder="+972..." dir="ltr" className="text-start" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <FormField
                control={form.control}
                name="side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("side")}</FormLabel>
                    {!showCustomSide ? (
                      <Select
                        onValueChange={(value) => {
                          if (value === "__custom__") {
                            setShowCustomSide(true);
                            field.onChange("");
                          } else {
                            field.onChange(value);
                          }
                        }}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectSide")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bride">{t("sides.bride")}</SelectItem>
                          <SelectItem value="groom">{t("sides.groom")}</SelectItem>
                          <SelectItem value="both">{t("sides.both")}</SelectItem>
                          <SelectItem value="__custom__">{t("customSide")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder={t("customSidePlaceholder")}
                            value={customSideValue}
                            onChange={(e) => {
                              setCustomSideValue(e.target.value);
                              field.onChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowCustomSide(false);
                            setCustomSideValue("");
                            field.onChange("");
                          }}
                        >
                          <Icons.close className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="groupName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("group")}</FormLabel>
                    {!showCustomGroup ? (
                      <Select
                        onValueChange={(value) => {
                          if (value === "__custom__") {
                            setShowCustomGroup(true);
                            field.onChange("");
                          } else {
                            field.onChange(value);
                          }
                        }}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("selectGroup")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="family">{t("groups.family")}</SelectItem>
                          <SelectItem value="friends">{t("groups.friends")}</SelectItem>
                          <SelectItem value="work">{t("groups.work")}</SelectItem>
                          <SelectItem value="other">{t("groups.other")}</SelectItem>
                          <SelectItem value="__custom__">{t("customGroup")}</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder={t("customGroupPlaceholder")}
                            value={customGroupValue}
                            onChange={(e) => {
                              setCustomGroupValue(e.target.value);
                              field.onChange(e.target.value);
                            }}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setShowCustomGroup(false);
                            setCustomGroupValue("");
                            field.onChange("");
                          }}
                        >
                          <Icons.close className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expectedGuests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("expectedGuests")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      {...field}
                      value={field.value || 1}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* RSVP Status */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <FormField
                control={form.control}
                name="rsvpStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("rsvpStatus")}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value as RsvpStatus)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectStatus")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">{t("statuses.pending")}</SelectItem>
                        <SelectItem value="ACCEPTED">{t("statuses.accepted")}</SelectItem>
                        <SelectItem value="DECLINED">{t("statuses.declined")}</SelectItem>
                        <SelectItem value="MAYBE">{t("statuses.maybe")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("rsvpStatus") === "ACCEPTED" && (
                <FormField
                  control={form.control}
                  name="rsvpGuestCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("confirmedGuests")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          {...field}
                          value={field.value || 1}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Message Status */}
            <FormItem>
              <FormLabel>{t("messageStatus")}</FormLabel>
              <Select
                onValueChange={(value) => setMessageStatus(value as NotificationStatus)}
                value={messageStatus || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectMessageStatus")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PENDING">{t("messageStatuses.pending")}</SelectItem>
                  <SelectItem value="SENT">{t("messageStatuses.sent")}</SelectItem>
                  <SelectItem value="DELIVERED">{t("messageStatuses.delivered")}</SelectItem>
                  <SelectItem value="FAILED">{t("messageStatuses.failed")}</SelectItem>
                  <SelectItem value="UNDELIVERED">{t("messageStatuses.undelivered")}</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tc("notes")}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={tc("notes")} rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end gap-2 border-t pt-4 sm:border-0 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                {tc("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
