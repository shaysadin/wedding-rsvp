"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { PdfInvitationWizard } from "@/components/invitations/pdf-wizard";
import { cn } from "@/lib/utils";

interface PdfInvitationsPageProps {
  params: Promise<{ eventId: string; locale: string }>;
}

export default function PdfInvitationsPage({ params }: PdfInvitationsPageProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [eventId, setEventId] = useState<string | null>(null);
  const [resolvedLocale, setResolvedLocale] = useState<string>("en");
  const [isLoading, setIsLoading] = useState(true);

  // Resolve params on mount
  useEffect(() => {
    params.then((p) => {
      setEventId(p.eventId);
      setResolvedLocale(p.locale);
      setIsLoading(false);
    });
  }, [params]);

  if (isLoading || !eventId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={isRTL ? "הזמנות PDF" : "PDF Invitations"}
        text={
          isRTL
            ? "צרו הזמנות מותאמות אישית בעברית ובאנגלית"
            : "Create personalized invitations in Hebrew and English"
        }
      >
        <div className={cn("flex flex-row flex-wrap gap-2", isRTL && "flex-row-reverse")}>
          <Button variant="outline" asChild>
            <Link href={`/${resolvedLocale}/dashboard/events/${eventId}`}>
              <ArrowLeft className={cn("h-4 w-4", isRTL ? "ml-2 rotate-180" : "mr-2")} />
              {isRTL ? "חזרה" : "Back"}
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      <div className="py-6">
        <PdfInvitationWizard />
      </div>
    </PageFadeIn>
  );
}
