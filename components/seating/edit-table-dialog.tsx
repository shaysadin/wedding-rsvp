"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { updateTable } from "@/actions/seating";
import { Shape, ColorTheme, SizePreset, SIZE_PRESETS } from "@/lib/validations/seating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

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
  square: { icon: "▢", description: "Square table" },
  circle: { icon: "⭕", description: "Round table" },
  rectangle: { icon: "▭", description: "Stadium table" },
  oval: { icon: "⬭", description: "Ellipse table" },
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

const editTableSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).max(32),
  shape: z.enum(["square", "circle", "rectangle", "oval"]).optional(),
  colorTheme: z.enum(["default", "blue", "green", "purple", "pink", "amber", "rose"]).optional(),
  width: z.number().int().min(40).max(400).optional(),
  height: z.number().int().min(40).max(400).optional(),
});

// Helper function to determine size preset from dimensions
function getSizePresetFromDimensions(shape: Shape, width?: number, height?: number): SizePreset {
  if (!width || !height) return "medium";

  const presets = SIZE_PRESETS[shape];

  // Check each preset to find matching dimensions
  for (const [preset, dims] of Object.entries(presets) as [SizePreset, { width: number; height: number }][]) {
    if (dims.width === width && dims.height === height) {
      return preset;
    }
  }

  // Default to custom dimensions (use medium as fallback display)
  return "medium";
}

type EditTableInput = z.infer<typeof editTableSchema>;

interface EditTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: {
    id: string;
    name: string;
    capacity: number;
    shape?: string | null;
    colorTheme?: string | null;
    width?: number;
    height?: number;
  } | null;
}

export function EditTableDialog({ open, onOpenChange, table }: EditTableDialogProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [sizePreset, setSizePreset] = useState<SizePreset>("medium");

  const form = useForm<EditTableInput>({
    resolver: zodResolver(editTableSchema),
    defaultValues: {
      id: "",
      name: "",
      capacity: 10,
      shape: "circle" as const,
      colorTheme: "default" as const,
      width: SIZE_PRESETS.circle.medium.width,
      height: SIZE_PRESETS.circle.medium.height,
    },
  });

  // Reset form when table changes
  useEffect(() => {
    if (table) {
      const shape = (table.shape as Shape) || "circle";
      const detectedPreset = getSizePresetFromDimensions(
        shape,
        table.width,
        table.height
      );
      setSizePreset(detectedPreset);

      form.reset({
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        shape: shape,
        colorTheme: (table.colorTheme as ColorTheme) || "default",
        width: table.width || SIZE_PRESETS[shape].medium.width,
        height: table.height || SIZE_PRESETS[shape].medium.height,
      });
    }
  }, [table, form]);

  // Watch shape
  const watchedShape = form.watch("shape");

  // Handle size preset change
  function handleSizePresetChange(preset: SizePreset) {
    setSizePreset(preset);
    const shape = watchedShape || "circle";
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

  async function onSubmit(data: EditTableInput) {
    try {
      const result = await updateTable(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("tableUpdated"));
      onOpenChange(false);

      // Dispatch event with updated table data for optimistic update
      window.dispatchEvent(new CustomEvent("seating-data-changed", {
        detail: {
          type: "table-updated",
          table: {
            id: data.id,
            name: data.name,
            capacity: data.capacity,
            shape: data.shape,
            width: data.width,
            height: data.height,
          },
        },
      }));
    } catch {
      toast.error("Failed to update table");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editTable")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tableName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("tableNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("capacity")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={32}
                        placeholder={t("capacityPlaceholder")}
                        {...field}
                        onChange={(e) =>
                          field.onChange(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Size Preset */}
              <FormItem>
                <FormLabel>{t("sizePreset.label")}</FormLabel>
                <div className="flex gap-1">
                  {(["medium", "large"] as SizePreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSizePresetChange(preset)}
                      className={cn(
                        "flex-1 px-2 py-2 text-xs border-2 rounded-lg transition-all hover:bg-accent",
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
            </div>

            <FormField
              control={form.control}
              name="shape"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shape")}</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape}
                        type="button"
                        onClick={() => handleShapeChange(shape)}
                        className={cn(
                          "flex items-center gap-2 p-2 border-2 rounded-lg transition-all hover:bg-accent",
                          field.value === shape
                            ? "border-primary bg-accent"
                            : "border-muted"
                        )}
                      >
                        <span className="text-xl">
                          {SHAPE_PREVIEWS[shape].icon}
                        </span>
                        <div className="text-start">
                          <div className="text-sm font-medium">
                            {t(`shapes.${shape}`)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                onClick={() => onOpenChange(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                )}
                {tc("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
