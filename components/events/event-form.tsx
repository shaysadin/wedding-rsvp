"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { WeddingEvent } from "@prisma/client";

import { createEvent, updateEvent } from "@/actions/events";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface EventFormProps {
  event?: WeddingEvent;
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("events");
  const tCommon = useTranslations("common");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: event?.title || "",
      description: event?.description || "",
      dateTime: event?.dateTime
        ? new Date(event.dateTime).toISOString().slice(0, 16)
        : "",
      location: event?.location || "",
      venue: event?.venue || "",
      notes: event?.notes || "",
      imageUrl: event?.imageUrl || "",
    },
  });

  const onSubmit = async (data: CreateEventInput) => {
    setIsLoading(true);

    try {
      const result = event
        ? await updateEvent({ id: event.id, ...data })
        : await createEvent(data);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(event ? "Event updated" : "Event created");
      router.push(`/${locale}/dashboard/events`);
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("eventName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Wedding of Sarah & David"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("eventDate")}</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={
                          field.value instanceof Date
                            ? field.value.toISOString().slice(0, 16)
                            : field.value
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("venue")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Grand Hotel Ballroom"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("location")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Tel Aviv, Israel"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description for your event"
                      rows={3}
                      {...field}
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
                  <FormLabel>{tCommon("notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes (not visible to guests)"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
                {event ? tCommon("save") : tCommon("create")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
