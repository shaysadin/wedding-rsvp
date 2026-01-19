"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { updateTable } from "@/actions/seating";
import { Shape, SeatingArrangement, ColorTheme } from "@/lib/validations/seating";
import { getAvailableArrangements } from "@/lib/seating/seat-calculator";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

const SHAPES: Shape[] = [
  "circle",
  "rectangle",
  "rectangleRounded",
  "concave",
  "concaveRounded",
];

const SEATING_ARRANGEMENTS: SeatingArrangement[] = [
  "even",
  "bride-side",
  "sides-only",
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
  circle: { icon: "⭕", description: "Round table" },
  rectangle: { icon: "▭", description: "Rectangular table" },
  rectangleRounded: { icon: "▢", description: "Rounded rectangle" },
  concave: { icon: "⌓", description: "Half circle" },
  concaveRounded: { icon: "⌒", description: "Rounded half circle" },
};

// Seating arrangement descriptions
const ARRANGEMENT_INFO: Record<SeatingArrangement, { description: string }> = {
  even: { description: "Seats evenly distributed around the table" },
  "bride-side": { description: "Seats divided between bride and groom sides" },
  "sides-only": { description: "Seats only on left and right sides (no head/foot)" },
  custom: { description: "Custom seat positioning (manual arrangement)" },
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
  capacity: z.number().int().min(1).max(100),
  shape: z.enum(["circle", "rectangle", "rectangleRounded", "concave", "concaveRounded"]).optional(),
  seatingArrangement: z.enum(["even", "bride-side", "sides-only", "custom"]).optional(),
  colorTheme: z.enum(["default", "blue", "green", "purple", "pink", "amber", "rose"]).optional(),
  width: z.number().int().min(40).max(400).optional(),
  height: z.number().int().min(40).max(400).optional(),
});

type EditTableInput = z.infer<typeof editTableSchema>;

interface EditTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: {
    id: string;
    name: string;
    capacity: number;
    shape?: string | null;
    seatingArrangement?: string | null;
    colorTheme?: string | null;
    width?: number;
    height?: number;
  } | null;
}

export function EditTableDialog({ open, onOpenChange, table }: EditTableDialogProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");

  const form = useForm<EditTableInput>({
    resolver: zodResolver(editTableSchema),
    defaultValues: {
      id: "",
      name: "",
      capacity: 10,
      shape: "circle" as const,
      seatingArrangement: "even" as const,
      colorTheme: "default" as const,
      width: 100,
      height: 100,
    },
  });

  // Reset form when table changes
  useEffect(() => {
    if (table) {
      form.reset({
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        shape: (table.shape as Shape) || "circle",
        seatingArrangement: (table.seatingArrangement as SeatingArrangement) || "even",
        colorTheme: (table.colorTheme as ColorTheme) || "default",
        width: table.width || 100,
        height: table.height || 100,
      });
    }
  }, [table, form]);

  // Watch shape to filter available arrangements
  const watchedShape = form.watch("shape");
  const availableArrangements = getAvailableArrangements(watchedShape || "circle");

  async function onSubmit(data: EditTableInput) {
    try {
      const result = await updateTable(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("tableUpdated"));
      onOpenChange(false);

      // Dispatch event to refresh data
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    } catch {
      toast.error("Failed to update table");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
                      max={100}
                      placeholder={t("capacityPlaceholder")}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("width")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={40}
                        max={400}
                        placeholder="100"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 100)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("height")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={40}
                        max={400}
                        placeholder="100"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 100)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        onClick={() => field.onChange(shape)}
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

            <FormField
              control={form.control}
              name="seatingArrangement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("seatingArrangement")}</FormLabel>
                  <div className="space-y-3">
                    {availableArrangements.map((arrangement) => (
                      <button
                        key={arrangement}
                        type="button"
                        onClick={() => field.onChange(arrangement)}
                        className={cn(
                          "w-full flex items-start gap-3 p-3 border-2 rounded-lg transition-all hover:bg-accent text-start",
                          field.value === arrangement
                            ? "border-primary bg-accent"
                            : "border-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center",
                            field.value === arrangement
                              ? "border-primary"
                              : "border-muted-foreground"
                          )}
                        >
                          {field.value === arrangement && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {t(`arrangements.${arrangement}`)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ARRANGEMENT_INFO[arrangement].description}
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
                  <div className="grid grid-cols-2 gap-3">
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => field.onChange(theme)}
                        className={cn(
                          "flex items-center gap-3 p-3 border-2 rounded-lg transition-all hover:bg-accent",
                          field.value === theme
                            ? "border-primary bg-accent"
                            : "border-muted"
                        )}
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full border-2",
                            THEME_COLORS[theme].bg,
                            THEME_COLORS[theme].border
                          )}
                        />
                        <div className="text-start">
                          <div className="text-sm font-medium capitalize">
                            {theme}
                          </div>
                        </div>
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
