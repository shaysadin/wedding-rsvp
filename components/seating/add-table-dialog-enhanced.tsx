"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createTable } from "@/actions/seating";
import {
  createTableSchema,
  type CreateTableInput,
  type Shape,
  type SeatingArrangement,
  type ColorTheme,
} from "@/lib/validations/seating";
import { calculateSeatPositions, getAvailableArrangements } from "@/lib/seating/seat-calculator";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface AddTableDialogEnhancedProps {
  eventId: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

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

export function AddTableDialogEnhanced({
  eventId,
  open = false,
  onOpenChange,
}: AddTableDialogEnhancedProps) {
  const t = useTranslations("seating");
  const tc = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("basic");

  const form = useForm<CreateTableInput>({
    resolver: zodResolver(createTableSchema),
    defaultValues: {
      weddingEventId: eventId,
      name: "",
      capacity: 10,
      shape: "circle" as const,
      seatingArrangement: "even" as const,
      colorTheme: "default" as const,
      width: 100,
      height: 100,
    },
  });

  const watchedCapacity = form.watch("capacity");
  const watchedShape = form.watch("shape");
  const watchedArrangement = form.watch("seatingArrangement");

  // Get available arrangements for the current shape
  const availableArrangements = getAvailableArrangements(watchedShape);

  async function onSubmit(data: CreateTableInput) {
    setIsLoading(true);
    try {
      const result = await createTable(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(t("tableCreated"));
      onOpenChange?.(false);
      form.reset();
      setCurrentTab("basic");

      // Dispatch event to refresh data
      window.dispatchEvent(new CustomEvent("seating-data-changed"));
    } catch {
      toast.error("Failed to create table");
    } finally {
      setIsLoading(false);
    }
  }

  // Generate preview seats for the current configuration
  const previewSeats = calculateSeatPositions(
    watchedCapacity || 10,
    watchedShape || "circle",
    watchedArrangement || "even"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("addTable")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">
                  <Icons.layoutGrid className="me-2 h-4 w-4" />
                  {t("tabs.basic")}
                </TabsTrigger>
                <TabsTrigger value="seating">
                  <Icons.users className="me-2 h-4 w-4" />
                  {t("tabs.seating")}
                </TabsTrigger>
                <TabsTrigger value="appearance">
                  <Icons.palette className="me-2 h-4 w-4" />
                  {t("tabs.appearance")}
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Basic Information */}
              <TabsContent value="basic" className="space-y-4 mt-4">
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
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)
                          }
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
              </TabsContent>

              {/* Tab 2: Seating Arrangement */}
              <TabsContent value="seating" className="space-y-4 mt-4">
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

                {/* Live Preview of Seating Arrangement */}
                <div className="border rounded-lg p-4 bg-muted/50">
                  <div className="text-sm font-medium mb-3">
                    {t("preview")}
                  </div>
                  <div className="flex items-center justify-center h-48 relative">
                    <div className="relative w-32 h-32">
                      {/* Table shape preview */}
                      <div
                        className={cn(
                          "absolute inset-0 border-2 border-primary/50 bg-card",
                          watchedShape === "circle" && "rounded-full",
                          watchedShape === "rectangle" && "rounded-none",
                          watchedShape === "rectangleRounded" && "rounded-lg",
                          watchedShape === "concave" && "rounded-t-full",
                          watchedShape === "concaveRounded" &&
                            "rounded-t-full rounded-b-lg"
                        )}
                      />
                      {/* Seat preview */}
                      {previewSeats.slice(0, Math.min(12, watchedCapacity)).map((seat, idx) => {
                        const x = (seat.relativeX + 1) * 50 + 16; // Scale to preview size
                        const y = (seat.relativeY + 1) * 50 + 16;
                        return (
                          <div
                            key={idx}
                            className="absolute w-3 h-3 rounded-full bg-blue-500 border border-blue-600"
                            style={{
                              left: x,
                              top: y,
                              transform: "translate(-50%, -50%)",
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="text-xs text-center text-muted-foreground mt-2">
                    {watchedCapacity} {t("seats")}
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Appearance */}
              <TabsContent value="appearance" className="space-y-4 mt-4">
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
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (currentTab === "seating") setCurrentTab("basic");
                  else if (currentTab === "appearance") setCurrentTab("seating");
                }}
                disabled={currentTab === "basic"}
              >
                <Icons.chevronLeft className="me-2 h-4 w-4" />
                {tc("previous")}
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange?.(false)}
                >
                  {tc("cancel")}
                </Button>

                {currentTab === "appearance" ? (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && (
                      <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    )}
                    {tc("create")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      if (currentTab === "basic") setCurrentTab("seating");
                      else if (currentTab === "seating")
                        setCurrentTab("appearance");
                    }}
                  >
                    {tc("next")}
                    <Icons.chevronRight className="ms-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
