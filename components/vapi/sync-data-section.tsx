"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { syncWeddingDataToVapi, previewSyncedData, clearSyncedData } from "@/actions/vapi/sync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface SyncDataSectionProps {
  eventId: string;
  syncStatus: {
    syncStatus: string | null;
    lastSyncAt: string | null;
    needsSync: boolean;
    guestCount: number;
    embeddings: Array<{
      id: string;
      contentType: string;
      createdAt: string;
      updatedAt: string;
    }>;
  } | null;
  onSync: () => void;
}

export function SyncDataSection({ eventId, syncStatus, onSync }: SyncDataSectionProps) {
  const t = useTranslations("voiceAgent.sync");
  const tc = useTranslations("common");

  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncWeddingDataToVapi(eventId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("syncSuccess", { count: result.stats?.guestsWithPhone || 0 }));
        onSync();
        window.dispatchEvent(new CustomEvent("voice-agent-data-changed"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePreview = async () => {
    try {
      const result = await previewSyncedData(eventId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPreviewData(result.embeddings || []);
        setIsPreviewOpen(true);
      }
    } catch {
      toast.error(tc("error"));
    }
  };

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const result = await clearSyncedData(eventId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(t("clearSuccess"));
        onSync();
        window.dispatchEvent(new CustomEvent("voice-agent-data-changed"));
      }
    } catch {
      toast.error(tc("error"));
    } finally {
      setIsClearing(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t("never");
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="p-5 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
            <Icons.database className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("title")}</h3>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Sync Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-1">{t("lastSync")}</p>
            <p className="text-sm font-medium">
              {formatDate(syncStatus?.lastSyncAt || null)}
            </p>
          </div>

          {syncStatus?.lastSyncAt && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("status")}</p>
                <Badge
                  variant={
                    syncStatus.syncStatus === "synced"
                      ? "default"
                      : syncStatus.syncStatus === "syncing"
                        ? "secondary"
                        : "destructive"
                  }
                  className="mt-0.5"
                >
                  {syncStatus.syncStatus || t("unknown")}
                </Badge>
              </div>

              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-1">{t("guests")}</p>
                <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
                  {syncStatus.guestCount}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Needs Sync Warning */}
        {syncStatus?.needsSync && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
              <Icons.alertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400">{t("needsSync")}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {t("syncing")}
              </>
            ) : (
              <>
                <Icons.refresh className="mr-2 h-4 w-4" />
                {syncStatus?.lastSyncAt ? t("resync") : t("syncNow")}
              </>
            )}
          </Button>

          {syncStatus?.lastSyncAt && (
            <>
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" onClick={handlePreview}>
                    <Icons.eye className="mr-2 h-4 w-4" />
                    {t("preview")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("previewTitle")}</DialogTitle>
                    <DialogDescription>{t("previewDescription")}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {previewData?.map((embedding) => (
                      <div key={embedding.id} className="rounded-lg border bg-muted/30 p-4">
                        <h4 className="font-medium mb-3 text-cyan-600 dark:text-cyan-400">{embedding.contentType}</h4>
                        <pre className="text-xs p-3 rounded-lg bg-muted border overflow-x-auto font-mono" dir="rtl">
                          {JSON.stringify(embedding.content, null, 2)}
                        </pre>
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          <Icons.clock className="h-3 w-3" />
                          {t("updated")}: {formatDate(embedding.updatedAt)}
                        </p>
                      </div>
                    ))}
                    {previewData?.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                          <Icons.database className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <p>{t("noData")}</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Icons.trash className="mr-2 h-4 w-4" />
                    {t("clear")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("clearConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("clearConfirmDescription")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClear}
                      disabled={isClearing}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isClearing && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                      {t("clearConfirm")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Icons.info className="h-3 w-3" />
          {t("hint")}
        </p>
      </div>
    </div>
  );
}
