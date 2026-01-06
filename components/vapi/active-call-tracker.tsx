"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { syncEventCalls } from "@/actions/vapi/calls";

interface ActiveCall {
  id: string;
  guestName: string;
  status: string;
  startedAt: string | null;
  phoneNumber: string;
}

interface ActiveCallTrackerProps {
  eventId: string;
  onCallsUpdated?: () => void;
}

// Polling intervals
const ACTIVE_POLL_INTERVAL = 5000;  // 5 seconds when calls are active
const IDLE_POLL_INTERVAL = 30000;   // 30 seconds when no calls (just checking)

export function ActiveCallTracker({ eventId, onCallsUpdated }: ActiveCallTrackerProps) {
  const t = useTranslations("voiceAgent");

  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousCallCountRef = useRef(0);

  const fetchActiveCalls = useCallback(async (isManual = false) => {
    if (isSyncing && !isManual) return; // Skip if already syncing (unless manual)

    setIsSyncing(true);
    try {
      const result = await syncEventCalls(eventId);

      if (result.activeCalls) {
        setActiveCalls(result.activeCalls.map((c: any) => ({
          id: c.id,
          guestName: c.guestName,
          status: c.status,
          startedAt: c.startedAt,
          phoneNumber: c.phoneNumber,
        })));
        setLastUpdated(new Date());

        // Check if calls completed
        const previousCount = previousCallCountRef.current;
        const currentCount = result.activeCalls.length;
        previousCallCountRef.current = currentCount;

        // If we had active calls and now we don't, notify parent
        if (previousCount > 0 && currentCount === 0) {
          onCallsUpdated?.();
        }

        // Update polling state
        setIsPolling(currentCount > 0);
      }
    } catch (error) {
      console.error("Error fetching active calls:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [eventId, isSyncing, onCallsUpdated]);

  // Smart polling - adjust interval based on active calls
  useEffect(() => {
    // Initial fetch
    fetchActiveCalls();

    const startPolling = () => {
      // Clear existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Determine poll interval based on active calls
      const interval = activeCalls.length > 0 ? ACTIVE_POLL_INTERVAL : IDLE_POLL_INTERVAL;

      pollIntervalRef.current = setInterval(() => {
        fetchActiveCalls();
      }, interval);
    };

    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [activeCalls.length]); // Re-setup polling when active call count changes

  // Calculate call duration
  const getCallDuration = (startedAt: string | null) => {
    if (!startedAt) return "0:00";
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const seconds = Math.floor((now - start) / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Update duration display every second for active calls
  const [, setTick] = useState(0);
  useEffect(() => {
    if (activeCalls.length === 0) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCalls.length]);

  if (activeCalls.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-emerald-200 dark:border-emerald-500/20">
        <div className="flex items-center gap-3">
          {/* Animated live indicator */}
          <div className="relative">
            <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
          </div>
          <h3 className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
            {t("activeCalls.title")}
            <span className="ms-2 text-foreground">({activeCalls.length})</span>
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchActiveCalls(true)}
          disabled={isSyncing}
          className="hover:bg-emerald-100 dark:hover:bg-emerald-500/20 hover:text-emerald-700 dark:hover:text-emerald-400"
        >
          <Icons.refresh className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        {activeCalls.map((call) => (
          <div
            key={call.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4"
          >
            {/* Left side - caller info */}
            <div className="flex items-center gap-4">
              {/* Phone icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                <Icons.phone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium">{call.guestName}</p>
                <p className="text-sm text-muted-foreground font-mono">{call.phoneNumber}</p>
              </div>
            </div>

            {/* Right side - status and timer */}
            <div className="flex items-center gap-3">
              <Badge
                variant={call.status === "CALLING" ? "default" : "secondary"}
                className={call.status === "CALLING" ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : ""}
              >
                {call.status === "CALLING" ? t("activeCalls.inProgress") : t("activeCalls.pending")}
              </Badge>
              {call.status === "CALLING" && call.startedAt && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-sm font-mono text-emerald-700 dark:text-emerald-400 min-w-[3.5rem] text-center">
                    {getCallDuration(call.startedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {lastUpdated && (
          <p className="text-xs text-muted-foreground text-center pt-2 flex items-center justify-center gap-2">
            <Icons.clock className="h-3 w-3" />
            {t("activeCalls.lastUpdated")}: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
