"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createVenueBlock } from "@/actions/seating";
import {
  createVenueBlockSchema,
  type CreateVenueBlockInput,
  type VenueBlockType,
  type Shape,
  type ColorTheme,
  type SizePreset,
  SIZE_PRESETS,
} from "@/lib/validations/seating";
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
import { cn } from "@/lib/utils";

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
  "square",
  "circle",
  "rectangle",
  "oval",
];

const COLOR_THEMES: ColorTheme[] = [
  "default",
  "blue",
  "green",
  "purple",
  "pink",
  "amber",
  "rose",
];

// Shape visual previews
const SHAPE_PREVIEWS: Record<Shape, { icon: string; description: string }> = {
  square: { icon: "▢", description: "Square block" },
  circle: { icon: "⭕", description: "Round block" },
  rectangle: { icon: "▭", description: "Rectangular block" },
  oval: { icon: "⬭", description: "Ellipse block" },
};

// Color theme swatches
const THEME_COLORS: Record<ColorTheme, { bg: string; border: string }> = {
  default: { bg: "bg-card", border: "border-primary/50" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900", border: "border-blue-400" },
  green: { bg: "bg-green-100 dark:bg-green-900", border: "border-green-400" },
  purple: { bg: "bg-purple-100 dark:bg-purple-900", border: "border-purple-400" },
  pink: { bg: "bg-pink-100 dark:bg-pink-900", border: "border-pink-400" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900", border: "border-amber-400" },
  rose: { bg: "bg-rose-100 dark:bg-rose-900", border: "border-rose-400" },
};

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
  const [sizePreset, setSizePreset] = useState<SizePreset>("medium");

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
      colorTheme: "default",
      width: SIZE_PRESETS.rectangle.medium.width,
      height: SIZE_PRESETS.rectangle.medium.height,
    },
  });

  const watchedShape = form.watch("shape");

  // Handle size preset change
  function handleSizePresetChange(preset: SizePreset) {
    setSizePreset(preset);
    const shape = watchedShape || "rectangle";
    const newSize = SIZE_PRESETS[shape][preset];
    form.setValue("width", newSize.width);
    form.setValue("height", newSize.height);
  }

  // Handle shape change - update dimensions based on current size preset
  function handleShapeChange(shape: Shape) {
    form.setValue("shape", shape);
    const newSize = SIZE_PRESETS[shape][sizePreset];
    form.setValue("width", newSize.width);
    form.setValue("height", newSize.height);
  }

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
      setSizePreset("medium");

      // Dispatch event with new block data for optimistic update
      if (result.block) {
        window.dispatchEvent(new CustomEvent("seating-data-changed", {
          detail: { type: "block-added", block: result.block },
        }));
      } else {
        window.dispatchEvent(new CustomEvent("seating-data-changed"));
      }
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("venueBlocks.add")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Selection */}
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

            {/* Name */}
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

            {/* Size Preset */}
            <FormItem>
              <FormLabel>{t("sizePreset.label")}</FormLabel>
              <div className="flex gap-2">
                {(["medium", "large"] as SizePreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSizePresetChange(preset)}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm border-2 rounded-lg transition-all hover:bg-accent",
                      sizePreset === preset
                        ? "border-primary bg-accent"
                        : "border-muted"
                    )}
                  >
                    {t(`sizePreset.${preset}`)}
                  </button>
                ))}
              </div>
            </FormItem>

            {/* Shape Selection */}
            <FormField
              control={form.control}
              name="shape"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shape")}</FormLabel>
                  <div className="grid grid-cols-2 gap-3">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => handleShapeChange(shape)}
                        className={cn(
                          "flex items-center gap-3 p-3 border-2 rounded-lg transition-all hover:bg-accent",
                          field.value === shape
                            ? "border-primary bg-accent"
                            : "border-muted"
                        )}
                      >
                        <span className="text-2xl">
                          {SHAPE_PREVIEWS[shape].icon}
                        </span>
                        <div className="text-start">
                          <div className="text-sm font-medium">
                            {t(`shapes.${shape}`)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {SHAPE_PREVIEWS[shape].description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Theme */}
            <FormField
              control={form.control}
              name="colorTheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("colorTheme")}</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => field.onChange(theme)}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 border-2 rounded-lg transition-all hover:bg-accent",
                          field.value === theme
                            ? "border-primary bg-accent"
                            : "border-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border-2",
                            THEME_COLORS[theme].bg,
                            THEME_COLORS[theme].border
                          )}
                        />
                        <span className="text-xs capitalize">{theme}</span>
                      </button>
                    ))}
                  </div>
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
