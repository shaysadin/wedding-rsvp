"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import { RsvpStatus } from "@prisma/client";

import { getInvitationImage, getGuestsForInvitations, getEventInvitations } from "@/actions/generate-invitation";
import { uploadInvitationImage, deleteInvitationImage } from "@/actions/upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import { InvitationCreationStepper } from "@/components/invitations/invitation-creation-stepper";
import { GeneratedInvitationsGallery } from "@/components/invitations/generated-invitations-gallery";
import { InvitationsGuestTable } from "@/components/invitations/invitations-guest-table";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EventDropdownSelector, type EventOption } from "@/components/events/event-dropdown-selector";
import { cn } from "@/lib/utils";

interface GuestForInvitation {
  id: string;
  name: string;
  phoneNumber: string | null;
  side: string | null;
  groupName: string | null;
  expectedGuests: number;
  rsvp?: {
    status: RsvpStatus;
    guestCount: number | null;
  } | null;
  imageInvitationSent: boolean;
  imageInvitationStatus: string | null;
  imageInvitationSentAt: Date | null;
}

interface GeneratedInvitation {
  id: string;
  pngUrl: string;
  createdAt: Date;
  template: {
    name: string;
    nameHe: string;
    thumbnailUrl: string | null;
  };
}

interface InvitationsPageContentProps {
  eventId: string;
  events: EventOption[];
  locale: string;
}

export function InvitationsPageContent({ eventId, events, locale }: InvitationsPageContentProps) {
  const t = useTranslations("invitations");
  const isRTL = locale === "he";

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestForInvitation[]>([]);
  const [generatedInvitations, setGeneratedInvitations] = useState<GeneratedInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const [activeTab, setActiveTab] = useState("create");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (!eventId) return;

    if (showLoading && isInitialLoad) {
      setIsLoading(true);
    }

    try {
      const [imageResult, guestsResult, invitationsResult] = await Promise.all([
        getInvitationImage(eventId),
        getGuestsForInvitations(eventId),
        getEventInvitations(eventId),
      ]);

      if (!imageResult.error) {
        setImageUrl(imageResult.imageUrl || null);
      }

      if (guestsResult.error) {
        toast.error(guestsResult.error);
      } else if (guestsResult.guests) {
        setGuests(guestsResult.guests as GuestForInvitation[]);
      }

      if (!invitationsResult.error && invitationsResult.invitations) {
        setGeneratedInvitations(invitationsResult.invitations as GeneratedInvitation[]);
      }
    } catch {
      toast.error("Failed to load invitation data");
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [eventId, isInitialLoad]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleRefresh = () => loadData(false);
    window.addEventListener("invitation-data-changed", handleRefresh);
    return () => window.removeEventListener("invitation-data-changed", handleRefresh);
  }, [loadData]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    if (!file.type.startsWith("image/")) {
      toast.error(isRTL ? "אנא בחר קובץ תמונה" : "Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? "התמונה גדולה מדי. גודל מקסימלי 5MB" : "Image is too large. Maximum size is 5MB");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64Data = event.target?.result as string;
        try {
          const result = await uploadInvitationImage(eventId, base64Data);
          if (result.error) {
            toast.error(result.error);
          } else if (result.success && result.url) {
            setImageUrl(result.url);
            toast.success(isRTL ? "התמונה הועלתה בהצלחה" : "Image uploaded successfully");
          }
        } catch {
          toast.error(isRTL ? "שגיאה בהעלאת התמונה" : "Error uploading image");
        }
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error(isRTL ? "שגיאה בקריאת הקובץ" : "Error reading file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error(isRTL ? "שגיאה בהעלאת התמונה" : "Error uploading image");
      setUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!eventId) return;
    setDeletingImage(true);
    try {
      const result = await deleteInvitationImage(eventId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setImageUrl(null);
        toast.success(isRTL ? "התמונה נמחקה" : "Image deleted");
      }
    } catch {
      toast.error(isRTL ? "שגיאה במחיקת התמונה" : "Error deleting image");
    }
    setDeletingImage(false);
  };

  return (
    <PageFadeIn className="space-y-6">
      {/* Header with Event Dropdown */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 sm:text-2xl">{t("title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("description")}</p>
          </div>
          <EventDropdownSelector
            events={events}
            selectedEventId={eventId}
            locale={locale}
            basePath={`/${locale}/dashboard/invitations`}
          />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Invitation Image Card */}
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-background to-muted/30 shadow-lg">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                {/* Image Preview */}
                <div className="relative flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted p-6 md:p-8">
                  <div className="relative">
                    {imageUrl ? (
                      <div className="group relative h-[180px] w-[180px] overflow-hidden rounded-2xl border-4 border-background shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
                        <Image
                          src={imageUrl}
                          alt={isRTL ? "הזמנה פעילה" : "Active invitation"}
                          fill
                          className="object-cover"
                          sizes="180px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-[180px] w-[180px] flex-col items-center justify-center gap-3 rounded-2xl border-4 border-dashed border-muted-foreground/20 bg-background/50 backdrop-blur-sm">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                          <Icons.media className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {isRTL ? "לא נבחרה הזמנה" : "No invitation"}
                        </span>
                      </div>
                    )}
                    {imageUrl && (
                      <div className="absolute -bottom-2 end-[-8px] flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-green-500 shadow-lg">
                        <Icons.check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col justify-center p-6 md:p-8">
                  <div className="mb-4">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        {isRTL ? "הזמנה פעילה" : "Active Invitation"}
                      </h3>
                      {imageUrl && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          {isRTL ? "מוכן" : "Ready"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isRTL
                        ? "ההזמנה הפעילה תישלח לאורחים בהודעות WhatsApp"
                        : "The active invitation will be sent to guests via WhatsApp"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={imageUrl ? "outline" : "default"}
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Icons.spinner className="h-4 w-4 animate-spin me-2" />
                      ) : (
                        <Icons.upload className="h-4 w-4 me-2" />
                      )}
                      {imageUrl
                        ? (isRTL ? "החלף" : "Replace")
                        : (isRTL ? "העלה תמונה" : "Upload Image")}
                    </Button>
                    {imageUrl && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <a href={imageUrl} download="invitation.png" target="_blank" rel="noopener noreferrer">
                            <Icons.download className="h-4 w-4 me-2" />
                            {isRTL ? "הורדה" : "Download"}
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDeleteImage}
                          disabled={deletingImage}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          {deletingImage ? (
                            <Icons.spinner className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icons.trash className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4" dir={isRTL ? "rtl" : "ltr"}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create" className="gap-2">
                <Icons.sparkles className="h-4 w-4" />
                {isRTL ? "יצירת הזמנה" : "Create"}
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-2">
                <Icons.media className="h-4 w-4" />
                {isRTL ? "גלריה" : "Gallery"}
                {generatedInvitations.length > 0 && (
                  <Badge variant="secondary" className="ms-1 h-5 w-5 rounded-full p-0 text-xs">
                    {generatedInvitations.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="send" className="gap-2">
                <Icons.mail className="h-4 w-4" />
                {isRTL ? "שליחה" : "Send"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icons.sparkles className="h-5 w-5" />
                    {isRTL ? "יצירת הזמנה עם AI" : "Create Invitation with AI"}
                  </CardTitle>
                  <CardDescription>
                    {isRTL
                      ? "עקבו אחר השלבים ליצירת הזמנה מותאמת אישית עם בינה מלאכותית"
                      : "Follow the steps to create a personalized invitation with AI"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InvitationCreationStepper
                    eventId={eventId}
                    onComplete={() => {
                      loadData();
                      setActiveTab("gallery");
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4">
              <GeneratedInvitationsGallery
                invitations={generatedInvitations}
                activeImageUrl={imageUrl}
                onRefresh={loadData}
              />
            </TabsContent>

            <TabsContent value="send" className="space-y-4">
              <InvitationsGuestTable
                guests={guests}
                eventId={eventId}
                hasInvitationImage={!!imageUrl}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </PageFadeIn>
  );
}
