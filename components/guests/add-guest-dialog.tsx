"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createGuest } from "@/actions/guests";
import { createGuestSchema, type CreateGuestInput } from "@/lib/validations/guest";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { DuplicateErrorDialog } from "./duplicate-error-dialog";

const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;

interface AddGuestDialogProps {
  eventId: string;
}

export function AddGuestDialog({ eventId }: AddGuestDialogProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const te = useTranslations("errors");
  const locale = useLocale();
  const isRTL = locale === "he";
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomGroup, setShowCustomGroup] = useState(false);
  const [customGroupValue, setCustomGroupValue] = useState("");
  const [showCustomSide, setShowCustomSide] = useState(false);
  const [customSideValue, setCustomSideValue] = useState("");

  // Duplicate error dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [duplicateGuestIds, setDuplicateGuestIds] = useState<string[]>([]);
  const [duplicateGuestName, setDuplicateGuestName] = useState("");
  const [duplicatePhone, setDuplicatePhone] = useState("");

  const form = useForm<CreateGuestInput>({
    resolver: zodResolver(createGuestSchema),
    defaultValues: {
      weddingEventId: eventId,
      name: "",
      phoneNumber: "",
      side: undefined,
      groupName: "",
      expectedGuests: 1,
      notes: "",
    },
  });

  // Watch groupName to detect if it's a custom value
  const groupNameValue = useWatch({ control: form.control, name: "groupName" });

  useEffect(() => {
    if (groupNameValue && !PREDEFINED_GROUPS.includes(groupNameValue as typeof PREDEFINED_GROUPS[number])) {
      setShowCustomGroup(true);
      setCustomGroupValue(groupNameValue);
    }
  }, [groupNameValue]);

  const onSubmit = async (data: CreateGuestInput) => {
    setIsLoading(true);

    try {
      const result = await createGuest(data);

      if (result.error) {
        if (result.error === "DUPLICATE_PHONE" && "duplicateNames" in result) {
          const typedResult = result as {
            error: string;
            duplicateNames: string[];
            duplicateGuestIds?: string[]
          };
          setDuplicateNames(typedResult.duplicateNames);
          setDuplicateGuestIds(typedResult.duplicateGuestIds || []);
          setDuplicateGuestName(data.name);
          setDuplicatePhone(data.phoneNumber || "");
          setDuplicateDialogOpen(true);
        } else {
          toast.error(result.error);
        }
        return;
      }

      toast.success(ts("saved"));
      form.reset();
      setShowCustomGroup(false);
      setCustomGroupValue("");
      setShowCustomSide(false);
      setCustomSideValue("");
      setOpen(false);
    } catch (error) {
      toast.error(te("generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Icons.userPlus className="me-2 h-4 w-4" />
          {t("add")}
        </Button>
      </DialogTrigger>
      <DialogContent dir={isRTL ? "rtl" : "ltr"}>
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("add")}</DialogTitle>
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
                        defaultValue={field.value}
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
                        defaultValue={field.value}
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
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end gap-2 border-t pt-4 sm:border-0 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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

      <DuplicateErrorDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        singleDuplicateNames={duplicateNames}
        singleDuplicateGuestIds={duplicateGuestIds}
        guestName={duplicateGuestName}
        phoneNumber={duplicatePhone}
        onExistingGuestDeleted={() => {
          // When the existing guest is deleted, close the dialog so user can retry adding the new guest
          setDuplicateNames([]);
          setDuplicateGuestIds([]);
        }}
      />
    </>
  );
}
