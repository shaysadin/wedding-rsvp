"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { toast } from "sonner";

import { getVapiEventSettings, getVoiceAgentStatus } from "@/actions/vapi/event-settings";
import { getSyncStatus } from "@/actions/vapi/sync";
import { getCallHistory } from "@/actions/vapi/calls";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { VoiceAgentSettings } from "@/components/vapi/voice-agent-settings";
import { SyncDataSection } from "@/components/vapi/sync-data-section";
import { CallGuestsSection } from "@/components/vapi/call-guests-section";
import { CallLogTable } from "@/components/vapi/call-log-table";
import { ActiveCallTracker } from "@/components/vapi/active-call-tracker";

interface VoiceAgentPageProps {
  params: Promise<{ eventId: string; locale: string }>;
}

export default function VoiceAgentPage({ params }: VoiceAgentPageProps) {
  const t = useTranslations("voiceAgent");
  const tc = useTranslations("common");

  const [eventId, setEventId] = useState<string | null>(null);
  const [locale, setLocale] = useState<string>("en");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [vapiEnabled, setVapiEnabled] = useState(false);
  const isFirstLoad = useRef(true);

  // Resolve params on mount
  useEffect(() => {
    params.then((p) => {
      setEventId(p.eventId);
      setLocale(p.locale);
    });
  }, [params]);

  // Initial data load (with full page loading state)
  const loadInitialData = useCallback(async () => {
    if (!eventId) return;

    setIsInitialLoading(true);
    try {
      const [settingsResult, statusResult, syncResult, callsResult] = await Promise.all([
        getVapiEventSettings(eventId),
        getVoiceAgentStatus(eventId),
        getSyncStatus(eventId),
        getCallHistory(eventId, { limit: 20 }),
      ]);

      if (settingsResult.error) {
        toast.error(settingsResult.error);
      } else {
        setSettings(settingsResult.settings);
        setVapiEnabled(settingsResult.vapiEnabled ?? false);
      }

      if (statusResult.error) {
        toast.error(statusResult.error);
      } else {
        setStatus(statusResult.status);
      }

      if (!syncResult.error) {
        setSyncStatus(syncResult);
      }

      if (!callsResult.error && callsResult.callLogs) {
        setCallLogs(callsResult.callLogs);
      }
    } catch {
      toast.error("Failed to load voice agent data");
    } finally {
      setIsInitialLoading(false);
      isFirstLoad.current = false;
    }
  }, [eventId]);

  // Background refresh (no full page loading, just updates data silently)
  const refreshData = useCallback(async () => {
    if (!eventId || isFirstLoad.current) return;

    setIsRefreshing(true);
    try {
      const [settingsResult, statusResult, syncResult, callsResult] = await Promise.all([
        getVapiEventSettings(eventId),
        getVoiceAgentStatus(eventId),
        getSyncStatus(eventId),
        getCallHistory(eventId, { limit: 20 }),
      ]);

      if (!settingsResult.error) {
        setSettings(settingsResult.settings);
        setVapiEnabled(settingsResult.vapiEnabled ?? false);
      }

      if (!statusResult.error) {
        setStatus(statusResult.status);
      }

      if (!syncResult.error) {
        setSyncStatus(syncResult);
      }

      if (!callsResult.error && callsResult.callLogs) {
        setCallLogs(callsResult.callLogs);
      }
    } catch {
      // Silent fail for background refresh
    } finally {
      setIsRefreshing(false);
    }
  }, [eventId]);

  // Specific refresh functions for each section
  const refreshSettings = useCallback(async () => {
    if (!eventId) return;
    try {
      const result = await getVapiEventSettings(eventId);
      if (!result.error) {
        setSettings(result.settings);
        setVapiEnabled(result.vapiEnabled ?? false);
      }
    } catch {}
  }, [eventId]);

  const refreshSyncStatus = useCallback(async () => {
    if (!eventId) return;
    try {
      const result = await getSyncStatus(eventId);
      if (!result.error) {
        setSyncStatus(result);
      }
    } catch {}
  }, [eventId]);

  const refreshCallLogs = useCallback(async () => {
    if (!eventId) return;
    try {
      const [statusResult, callsResult] = await Promise.all([
        getVoiceAgentStatus(eventId),
        getCallHistory(eventId, { limit: 20 }),
      ]);
      if (!statusResult.error) {
        setStatus(statusResult.status);
      }
      if (!callsResult.error && callsResult.callLogs) {
        setCallLogs(callsResult.callLogs);
      }
    } catch {}
  }, [eventId]);

  // Load data when eventId is available
  useEffect(() => {
    if (eventId) {
      loadInitialData();
    }
  }, [eventId, loadInitialData]);

  // Listen for data refresh events (background refresh only)
  useEffect(() => {
    const handleRefresh = () => {
      refreshData();
    };

    window.addEventListener("voice-agent-data-changed", handleRefresh);
    return () => {
      window.removeEventListener("voice-agent-data-changed", handleRefresh);
    };
  }, [refreshData]);

  if (!eventId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <PageFadeIn>
      <DashboardHeader heading={t("title")} text={t("description")}>
        <div className="flex items-center gap-2">
          {/* Background refresh indicator */}
          {isRefreshing && (
            <Icons.spinner className="h-4 w-4 animate-spin text-violet-400" />
          )}
          <Button variant="outline" asChild className="bg-white/5 border-white/10 hover:bg-white/10">
            <Link href={`/${locale}/dashboard/events/${eventId}`}>
              <Icons.arrowLeft className="mr-2 h-4 w-4" />
              {tc("back")}
            </Link>
          </Button>
        </div>
      </DashboardHeader>

      {/* Initial Loading State - only shown on first load */}
      {isInitialLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
            <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-purple-500/50 animate-spin [animation-delay:0.15s]" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{tc("loading")}</p>
        </div>
      ) : !vapiEnabled ? (
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-xl p-6">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
              <Icons.alertTriangle className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-rose-400">{t("notEnabled.title")}</h3>
              <p className="text-sm text-rose-300/80 mt-1">{t("notEnabled.description")}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Platform Status */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Icons.globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-muted-foreground">{t("status.platform")}</span>
              </div>
              <Badge
                variant={status?.platformEnabled ? "default" : "secondary"}
                className={status?.platformEnabled ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : ""}
              >
                {status?.platformEnabled ? t("status.active") : t("status.inactive")}
              </Badge>
            </div>

            {/* Event Status */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                  <Icons.calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-sm text-muted-foreground">{t("status.event")}</span>
              </div>
              <Badge
                variant={settings?.isEnabled ? "default" : "secondary"}
                className={settings?.isEnabled ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : ""}
              >
                {settings?.isEnabled ? t("status.active") : t("status.inactive")}
              </Badge>
            </div>

            {/* Sync Status */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-full bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                  <Icons.refresh className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <span className="text-sm text-muted-foreground">{t("status.sync")}</span>
              </div>
              <Badge
                variant={syncStatus?.lastSyncAt ? "default" : "secondary"}
                className={syncStatus?.lastSyncAt ? "bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400" : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"}
              >
                {syncStatus?.lastSyncAt
                  ? new Date(syncStatus.lastSyncAt).toLocaleDateString()
                  : t("status.notSynced")}
              </Badge>
            </div>

            {/* Calls Status */}
            {status?.callStats && (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                    <Icons.phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">{t("status.calls")}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {status.callStats.completed}
                  </span>
                  <span className="text-muted-foreground text-sm">/ {status.callStats.total}</span>
                </div>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <VoiceAgentSettings
            eventId={eventId}
            settings={settings}
            onUpdate={refreshSettings}
          />

          {/* Sync Data Section */}
          <SyncDataSection
            eventId={eventId}
            syncStatus={syncStatus}
            onSync={refreshSyncStatus}
          />

          {/* Call Guests Section */}
          <CallGuestsSection
            eventId={eventId}
            isEnabled={settings?.isEnabled && status?.platformEnabled}
            hasSyncedData={!!syncStatus?.lastSyncAt}
            onCallsStarted={refreshCallLogs}
          />

          {/* Active Call Tracker - shows real-time status */}
          <ActiveCallTracker
            eventId={eventId}
            onCallsUpdated={refreshCallLogs}
          />

          {/* Call History */}
          <CallLogTable
            callLogs={callLogs}
            onRefresh={refreshCallLogs}
          />
        </div>
      )}
    </PageFadeIn>
  );
}
