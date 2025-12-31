"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he, enUS } from "date-fns/locale";
import {
  Archive,
  Calendar,
  Download,
  Eye,
  Loader2,
  Trash2,
  Users,
  AlertCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getArchiveDownloadUrl, deleteArchive } from "@/actions/archives";

interface Archive {
  id: string;
  originalEventId: string;
  eventTitle: string;
  eventDate: string;
  guestCount: number;
  archiveSize: number | null;
  archivedAt: string;
}

interface ArchivesPageClientProps {
  archives: Archive[];
  locale: string;
  r2Configured: boolean;
}

export function ArchivesPageClient({
  archives,
  locale,
  r2Configured,
}: ArchivesPageClientProps) {
  const t = useTranslations("archives");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const dateLocale = locale === "he" ? he : enUS;

  const handleDownload = async (archiveId: string) => {
    setLoadingId(archiveId);
    try {
      const result = await getArchiveDownloadUrl(archiveId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Open download URL in new tab
      window.open(result.url, "_blank");
      toast.success(t("downloadStarted"));
    } catch {
      toast.error(t("downloadError"));
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (archiveId: string) => {
    setLoadingId(archiveId);
    try {
      const result = await deleteArchive(archiveId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(t("deleteSuccess"));
      router.refresh();
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setLoadingId(null);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (!r2Configured) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("storageNotConfigured")}</AlertTitle>
        <AlertDescription>
          {t("storageNotConfiguredDescription")}
        </AlertDescription>
      </Alert>
    );
  }

  if (archives.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Archive className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">{t("noArchives")}</h3>
          <p className="text-center text-sm text-muted-foreground max-w-md">
            {t("noArchivesDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {archives.map((archive) => (
        <Card key={archive.id} className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg line-clamp-1">
              {archive.eventTitle}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(archive.eventDate).toLocaleDateString(locale)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>
                  {archive.guestCount} {t("guests")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Archive className="h-4 w-4" />
                <span>{formatBytes(archive.archiveSize)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("archivedAt")}:{" "}
              {formatDistanceToNow(new Date(archive.archivedAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() =>
                  router.push(`/${locale}/dashboard/archives/${archive.id}`)
                }
              >
                <Eye className="mr-2 h-4 w-4" />
                {t("view")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(archive.id)}
                disabled={loadingId === archive.id}
                title={t("download")}
              >
                {loadingId === archive.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={loadingId === archive.id}
                    title={t("delete")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("confirmDeleteDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(archive.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
