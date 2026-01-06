"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createVenueBlock } from "@/actions/seating";
import { createVenueBlockSchema, type CreateVenueBlockInput, type VenueBlockType, type Shape } from "@/lib/validations/seating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const VENUE_BLOCK_TYPES: VenueBlockType[] = [
  "dj",
  "bar",
  "stage",
  "danceFloor",
  "entrance",
  "photoBooth",
  "buffet",
  "cake",
  "gifts",
  "other",
];

const SHAPES: Shape[] = [
  "circle",
  "rectangle",
  "rectangleRounded",
  "concave",
  "concaveRounded",
];

interface AddVenueBlockDialogProps {
  eventId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddVenueBlockDialog({ eventId, open: controlledOpen, onOpenChange }: AddVenueBlockDialogProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const form = useForm<CreateVenueBlockInput>({
    resolver: zodResolver(createVenueBlockSchema),
    defaultValues: {
      weddingEventId: eventId,
      name: "",
      type: "other",
      shape: "rectangle",
    },
  });

  // When type changes, set a default name based on type
  const handleTypeChange = (type: VenueBlockType, onChange: (value: VenueBlockType) => void) => {
    onChange(type);
    const currentName = form.getValues("name");
    if (!currentName) {
      form.setValue("name", t(`venueBlocks.types.${type}`));
    }
  };

  async function onSubmit(data: CreateVenueBlockInput) {
    setIsLoading(true);
    try {
      const result = await createVenueBlock(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("venueBlocks.blockCreated"));
      setOpen(false);
      form.reset();

      // Dispatch event to refresh data
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    } catch {
      toast.error("Failed to create venue block");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button variant="outline">
            <Icons.add className="me-2 h-4 w-4" />
            {t("venueBlocks.add")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("venueBlocks.add")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("venueBlocks.type")}</FormLabel>
                  <Select
                    onValueChange={(value) => handleTypeChange(value as VenueBlockType, field.onChange)}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("venueBlocks.type")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {VENUE_BLOCK_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`venueBlocks.types.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("venueBlocks.name")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("venueBlocks.namePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shape"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shape")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("shape")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SHAPES.map((shape) => (
                        <SelectItem key={shape} value={shape}>
                          {t(`shapes.${shape}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                )}
                {tc("create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
