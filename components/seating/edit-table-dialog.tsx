"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { updateTable } from "@/actions/seating";
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

const editTableSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  capacity: z.number().int().min(1).max(100),
  shape: z.enum(["round", "rectangular", "oval"]).optional(),
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
      shape: "round",
    },
  });

  // Reset form when table changes
  useEffect(() => {
    if (table) {
      form.reset({
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        shape: (table.shape as "round" | "rectangular" | "oval") || "round",
      });
    }
  }, [table, form]);

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

            <FormField
              control={form.control}
              name="shape"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("shape")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("shape")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="round">{t("shapes.round")}</SelectItem>
                      <SelectItem value="rectangular">{t("shapes.rectangular")}</SelectItem>
                      <SelectItem value="oval">{t("shapes.oval")}</SelectItem>
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
                onClick={() => onOpenChange(false)}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
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
