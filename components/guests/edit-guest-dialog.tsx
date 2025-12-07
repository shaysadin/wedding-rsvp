"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Guest, GuestRsvp } from "@prisma/client";

import { updateGuest } from "@/actions/guests";
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
};

interface EditGuestDialogProps {
  guest: GuestWithRsvp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGuestDialog({ guest, open, onOpenChange }: EditGuestDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const te = useTranslations("errors");
  const locale = useLocale();
  const isRTL = locale === "he";
  const [isLoading, setIsLoading] = useState(false);

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
    },
  });

  // Reset form when guest changes
  useEffect(() => {
    if (open) {
      form.reset({
        id: guest.id,
        name: guest.name,
        phoneNumber: guest.phoneNumber || "",
        side: guest.side as "bride" | "groom" | "both" | undefined,
        groupName: guest.groupName || "",
        expectedGuests: guest.expectedGuests || 1,
        notes: guest.notes || "",
      });
    }
  }, [guest, open, form]);

  const onSubmit = async (data: UpdateGuestInput) => {
    setIsLoading(true);

    try {
      const result = await updateGuest(data);

      if (result.error) {
        toast.error(result.error);
        return;
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
      <DialogContent dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("edit")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="side"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("side")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectSide")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bride">{t("sides.bride")}</SelectItem>
                        <SelectItem value="groom">{t("sides.groom")}</SelectItem>
                        <SelectItem value="both">{t("sides.both")}</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                      </SelectContent>
                    </Select>
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

            <div className="flex justify-end gap-2">
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
