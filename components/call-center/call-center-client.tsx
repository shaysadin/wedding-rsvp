"use client";

/**
 * Call Center Client Component
 *
 * Comprehensive browser-based call center with:
 * - Guest list with search/filters
 * - Active call panel with controls
 * - Voice changer (5 presets)
 * - Call notes and RSVP updates
 * - Call history drawer
 * - Real-time call status
 */

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Device } from "@twilio/voice-sdk";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  User,
  Clock,
  Search,
  Filter,
  History,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useDirection } from "@/hooks/use-direction";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
// Voice processor temporarily disabled - will be re-implemented using Web Audio API
// import { VoiceProcessor, type VoicePreset } from "@/lib/twilio-voice/voice-processor";
type VoicePreset = "normal" | "deep" | "high" | "robot" | "elderly";
import {
  initiateCall,
  updateCallSid,
  updateCallNotes,
  updateRsvpFromCall,
} from "@/actions/call-center";

interface Guest {
  id: string;
  name: string;
  phoneNumber: string | null;
  rsvp: { status: string; guestCount: number } | null;
  manualCallLogs: any[];
}

interface CallLog {
  id: string;
  guestId: string;
  phoneNumber: string;
  status: string;
  duration: number | null;
  initiatedAt: string;
  guest: { id: string; name: string };
  operator: { name: string | null };
}

interface Props {
  eventId: string;
  locale: string;
  initialGuests: Guest[];
  initialHistory: CallLog[];
  isConfigured: boolean;
}

export function CallCenterClient({ eventId, locale, initialGuests, initialHistory, isConfigured }: Props) {
  const t = useTranslations("callCenter");
  const tCommon = useTranslations("common");
  const { dir } = useDirection();

  // State
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [history, setHistory] = useState<CallLog[]>(initialHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("pending-maybe-declined"); // Default: show pending, maybe, declined
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [filterHasPhone, setFilterHasPhone] = useState<boolean>(true); // Default: only show guests with phone
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  // Call state
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<string>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [callLogId, setCallLogId] = useState<string | null>(null);

  // Call controls
  const [isMuted, setIsMuted] = useState(false);
  const [voicePreset, setVoicePreset] = useState<VoicePreset>("normal");
  const [callNotes, setCallNotes] = useState("");
  const [newRsvpStatus, setNewRsvpStatus] = useState<string>("");
  const [newGuestCount, setNewGuestCount] = useState<number>(1);

  // Refs
  const deviceRef = useRef<Device | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializationAttemptedRef = useRef<boolean>(false);
  const lastErrorTimeRef = useRef<number>(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Twilio Device
  useEffect(() => {
    console.log("[Call Center] isConfigured:", isConfigured, "initializationAttempted:", initializationAttemptedRef.current);

    // Only attempt initialization if configured and not already attempted
    if (isConfigured && !initializationAttemptedRef.current) {
      console.log("[Call Center] Initializing Twilio Device...");
      initializationAttemptedRef.current = true;
      initializeTwilioDevice();
    } else if (!isConfigured) {
      console.warn("[Call Center] Skipping initialization - Twilio Voice not configured");
    }

    return () => {
      if (deviceRef.current) {
        console.log("[Call Center] Destroying Twilio Device...");
        deviceRef.current.destroy();
      }
      // Clean up media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isConfigured]);

  // Call duration timer
  useEffect(() => {
    if (callStatus === "connected") {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (callStatus === "idle") {
        setCallDuration(0);
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [callStatus]);

  async function initializeTwilioDevice() {
    try {
      console.log("[Call Center Client] Fetching token...");

      // Get capability token
      const response = await fetch("/api/twilio-voice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      console.log("[Call Center Client] Token response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to get token";

        console.error("[Call Center Client] Token fetch failed:", errorMessage);

        // Don't show scary errors if it's just not configured
        if (errorMessage.includes("not configured") || errorMessage.includes("disabled")) {
          console.warn("Twilio Voice not configured:", errorMessage);
          toast.warning("Call center is not configured. Please contact support to enable this feature.");
          return;
        }

        throw new Error(errorMessage);
      }

      const { token, identity } = await response.json();

      console.log("[Call Center Client] Token received:", {
        hasToken: !!token,
        tokenLength: token?.length,
        identity,
      });

      if (!token) {
        throw new Error("No token received from server");
      }

      // Decode token to verify its contents (JWT has 3 parts separated by dots)
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("[Call Center Client] Token payload:", {
            iss: payload.iss, // Issuer (Account SID)
            sub: payload.sub, // Subject (API Key SID)
            grants: payload.grants,
            exp: new Date(payload.exp * 1000).toISOString(), // Expiration
          });
        }
      } catch (e) {
        console.error("[Call Center Client] Failed to decode token:", e);
      }

      // Create Device
      console.log("[Call Center Client] Creating Twilio Device with token...");
      const device = new Device(token, {
        logLevel: 1, // Debug level
        // Add edge locations to help with connectivity
        edge: ["ashburn", "dublin", "singapore"],
      });

      // Setup event listeners
      device.on("registered", () => {
        console.log("[Call Center Client] ✅ Twilio Device registered successfully");
        toast.success("Call center ready");
      });

      device.on("error", (error: any) => {
        console.error("[Call Center Client] ❌ Twilio Device error:", error);

        // Log more helpful error info
        if (error.code === 31000) {
          console.error("⚠️  ERROR 31000 - WebSocket Connection Failed");
          console.error("   Most common causes:");
          console.error("   1. ❌ TwiML App SID doesn't exist or belongs to different account");
          console.error("   2. ❌ Account SID and API Key are from different Twilio accounts");
          console.error("   3. ❌ API Key Secret is incorrect");
          console.error("");
          console.error("   → Go to Twilio Console → Voice → TwiML Apps");
          console.error("   → Verify the TwiML App exists and copy its SID");
          console.error("   → Update the TwiML App SID in admin panel");
        }

        // Prevent repeated error toasts (only show once per 10 seconds)
        const now = Date.now();
        if (now - lastErrorTimeRef.current > 10000) {
          lastErrorTimeRef.current = now;

          // Only show error if device was previously working
          if (deviceRef.current) {
            toast.error("Device error: " + error.message);
          }
        }
      });

      // Register device
      console.log("[Call Center Client] Registering Twilio Device...");
      await device.register();
      deviceRef.current = device;
      console.log("[Call Center Client] Device stored in ref");
    } catch (error: any) {
      console.error("Failed to initialize device:", error);
      toast.error("Failed to initialize call center: " + error.message);
    }
  }

  async function handleCall(guest: Guest) {
    if (!isConfigured) {
      toast.error("Call center is not configured. Please contact your system administrator.");
      return;
    }

    if (!guest.phoneNumber) {
      toast.error("Guest has no phone number");
      return;
    }

    if (!deviceRef.current) {
      toast.error("Device not initialized. Please refresh the page and try again.");
      console.error("[Call Center] Device is null when trying to call");
      return;
    }

    try {
      setSelectedGuest(guest);
      setCallStatus("initiating");
      setNewGuestCount(guest.rsvp?.guestCount || 1);

      // Create call log
      const result = await initiateCall({ eventId, guestId: guest.id, locale });

      if (!result.success || !result.callLog) {
        throw new Error(result.error || "Failed to initiate call");
      }

      setCallLogId(result.callLog.id);

      // Make call - Twilio will handle microphone access
      const call = await deviceRef.current.connect({
        params: {
          To: guest.phoneNumber,
        },
      });

      console.log("[Call Center] Call initiated:", call.parameters.CallSid);

      setCurrentCall(call);
      setCallStatus("ringing");

      // Update call log with Twilio SID
      await updateCallSid(result.callLog.id, call.parameters.CallSid);

      // Call event listeners
      call.on("accept", () => {
        console.log("[Call Center] Call accepted");
        setCallStatus("connected");
        toast.success(`Connected to ${guest.name}`);

        // Get the media stream for potential future voice processing
        try {
          const stream = call.getLocalStream();
          if (stream) {
            mediaStreamRef.current = stream;
            console.log("[Call Center] Media stream captured");
          }
        } catch (e) {
          console.warn("[Call Center] Could not get media stream:", e);
        }
      });

      call.on("disconnect", () => {
        console.log("[Call Center] Call disconnected");
        handleEndCall();
      });

      call.on("cancel", () => {
        console.log("[Call Center] Call cancelled");
        setCallStatus("idle");
        toast.info("Call cancelled");
        // Clean up media stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      });

      call.on("error", (error: any) => {
        console.error("[Call Center] Call error:", error);
        toast.error("Call error: " + error.message);
        handleEndCall();
      });
    } catch (error: any) {
      console.error("[Call Center] Failed to initiate call:", error);
      toast.error(error.message || "Failed to initiate call");
      setCallStatus("idle");
      setSelectedGuest(null);
    }
  }

  function handleEndCall() {
    console.log("[Call Center] Ending call and cleaning up...");

    if (currentCall) {
      currentCall.disconnect();
    }

    // Stop all media tracks to release microphone
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("[Call Center] Stopped media track:", track.kind);
      });
      mediaStreamRef.current = null;
    }

    setCallStatus("idle");
    setCurrentCall(null);
    setCallDuration(0);
    setCallNotes("");
    setNewRsvpStatus("");

    toast.info("Call ended");
  }

  function handleMuteToggle() {
    if (currentCall) {
      currentCall.mute(!isMuted);
      setIsMuted(!isMuted);
    }
  }

  function handleVoiceChange(preset: VoicePreset) {
    // Voice changing feature is temporarily disabled
    // TODO: Implement voice effects using Web Audio API
    setVoicePreset(preset);
    toast.info(`Voice effect selected: ${preset} (feature coming soon)`);
    console.log("[Call Center] Voice preset selected:", preset, "- implementation pending");
  }

  async function handleSaveNotes() {
    if (!callLogId) return;

    const result = await updateCallNotes({
      callLogId,
      notes: callNotes,
      eventId,
      locale,
    });

    if (result.success) {
      toast.success("Notes saved");
    } else {
      toast.error(result.error || "Failed to save notes");
    }
  }

  async function handleUpdateRsvp() {
    if (!selectedGuest || !newRsvpStatus) return;

    const result = await updateRsvpFromCall({
      callLogId: callLogId || undefined,
      guestId: selectedGuest.id,
      newRsvpStatus: newRsvpStatus as any,
      guestCount: newRsvpStatus === "ACCEPTED" ? newGuestCount : undefined,
      eventId,
      locale,
    });

    if (result.success) {
      toast.success("RSVP updated");

      // Update local guest state
      setGuests(prevGuests =>
        prevGuests.map(g =>
          g.id === selectedGuest.id
            ? {
                ...g,
                rsvp: {
                  status: newRsvpStatus,
                  guestCount: newRsvpStatus === "ACCEPTED" ? newGuestCount : (g.rsvp?.guestCount || 0)
                }
              }
            : g
        )
      );

      // Update selected guest state
      setSelectedGuest(prev => prev ? {
        ...prev,
        rsvp: {
          status: newRsvpStatus,
          guestCount: newRsvpStatus === "ACCEPTED" ? newGuestCount : (prev.rsvp?.guestCount || 0)
        }
      } : null);

      setNewRsvpStatus("");
      setNewGuestCount(1);
    } else {
      toast.error(result.error || "Failed to update RSVP");
    }
  }

  // Filter guests
  const filteredGuests = guests.filter((guest: any) => {
    const matchesSearch = guest.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Enhanced status filter with combined option
    let matchesStatus = false;
    if (filterStatus === "all") {
      matchesStatus = true;
    } else if (filterStatus === "pending-maybe-declined") {
      // Default: show pending, maybe, and declined
      matchesStatus =
        !guest.rsvp ||
        guest.rsvp.status === "PENDING" ||
        guest.rsvp.status === "MAYBE" ||
        guest.rsvp.status === "DECLINED";
    } else if (filterStatus === "pending") {
      matchesStatus = !guest.rsvp || guest.rsvp.status === "PENDING";
    } else if (filterStatus === "maybe") {
      matchesStatus = guest.rsvp?.status === "MAYBE";
    } else if (filterStatus === "confirmed") {
      matchesStatus = guest.rsvp?.status === "ACCEPTED";
    } else if (filterStatus === "declined") {
      matchesStatus = guest.rsvp?.status === "DECLINED";
    }

    const matchesGroup =
      filterGroup === "all" || guest.group === filterGroup;
    const matchesHasPhone = !filterHasPhone || guest.phoneNumber;

    return matchesSearch && matchesStatus && matchesGroup && matchesHasPhone;
  });

  // Get unique groups for filter
  const uniqueGroups = Array.from(new Set(guests.map((g: any) => g.group).filter(Boolean)));

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Guest panel content (used in both desktop and mobile views)
  const renderGuestPanelContent = () => {
    if (!selectedGuest) {
      return (
        <div className="flex items-center justify-center h-full text-center text-muted-foreground py-12">
          <div>
            <User className="h-16 w-16 mx-auto mb-4 opacity-30" />
            {!isConfigured ? (
              <div>
                <p className="font-medium text-destructive mb-2">{t("notConfigured")}</p>
                <p className="text-sm">{t("notConfiguredDescription")}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium mb-1">{t("noGuestSelected")}</p>
                <p className="text-sm">{t("selectGuestPrompt")}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Guest Info Card */}
        <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1 flex-1">
              <p className="text-sm text-muted-foreground">{t("contactInformation")}</p>
              <p className="font-semibold text-lg">{selectedGuest.name}</p>
              <p className="text-sm flex items-center gap-1" dir="ltr">
                <Phone className="h-3 w-3" />
                {selectedGuest.phoneNumber || t("noPhone")}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-muted-foreground">{t("callStatus")}</p>
              <Badge
                variant={callStatus === "connected" ? "default" : callStatus === "idle" ? "secondary" : "outline"}
                className="capitalize"
              >
                {callStatus === "idle" ? t("ready") : callStatus === "ringing" ? t("ringing") : callStatus === "connected" ? t("connected") : callStatus === "initiating" ? t("initiating") : callStatus}
              </Badge>
              {callStatus === "connected" && (
                <div className="flex items-center gap-1 text-sm font-mono mt-2">
                  <Clock className="h-3 w-3" />
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>
          </div>

          {/* Call/Hangup Button */}
          {callStatus === "idle" ? (
            <Button
              onClick={handleInitiateCall}
              disabled={!isConfigured || !selectedGuest.phoneNumber}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              <Phone className={`h-5 w-5 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
              {t("callGuest")}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  onClick={handleMuteToggle}
                  disabled={callStatus !== "connected"}
                  className="flex-1 h-12 text-base"
                >
                  {isMuted ? (
                    <>
                      <MicOff className={`h-5 w-5 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                      {t("unmute")}
                    </>
                  ) : (
                    <>
                      <Mic className={`h-5 w-5 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                      {t("mute")}
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleEndCall}
                  className="flex-1 h-12 text-base font-semibold"
                >
                  <PhoneOff className={`h-5 w-5 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                  {t("hangUp")}
                </Button>
              </div>

              {/* Voice Changer - shown only during active call */}
              {callStatus === "connected" && (
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground">{t("voiceEffect")}</Label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {(["normal", "deep", "high", "robot", "elderly"] as VoicePreset[]).map((preset) => (
                      <Button
                        key={preset}
                        variant={voicePreset === preset ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleVoiceChange(preset)}
                        disabled={true}
                        className="capitalize text-xs"
                      >
                        {t(`voiceEffects.${preset}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Update RSVP - Moved above notes */}
        <div className="space-y-3">
          <Label htmlFor="rsvp-status" className="text-base font-semibold">
            {t("updateRsvpStatus")}
          </Label>
          <div className="flex gap-2 items-center flex-wrap">
            <Select value={newRsvpStatus} onValueChange={setNewRsvpStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("selectNewStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCEPTED">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {t("rsvpStatuses.accepted")}
                  </div>
                </SelectItem>
                <SelectItem value="DECLINED">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {t("rsvpStatuses.declined")}
                  </div>
                </SelectItem>
                <SelectItem value="MAYBE">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-500" />
                    {t("rsvpStatuses.maybe")}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Guest Count Input - Only visible when ACCEPTED is selected */}
            {newRsvpStatus === "ACCEPTED" && (
              <>
                <Label htmlFor="guest-count" className="text-sm whitespace-nowrap">
                  {t("guestCount")}:
                </Label>
                <Input
                  id="guest-count"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newGuestCount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    if (value === '') {
                      setNewGuestCount(1);
                    } else {
                      const num = parseInt(value);
                      setNewGuestCount(Math.min(Math.max(1, num), 20));
                    }
                  }}
                  className="w-16 h-9 text-center"
                />
              </>
            )}

            <Button
              onClick={handleUpdateRsvp}
              disabled={!newRsvpStatus}
              variant="default"
            >
              <CheckCircle2 className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
              {t("update")}
            </Button>
          </div>
        </div>

        {/* Call Notes - Now below RSVP */}
        <div className="space-y-3">
          <Label htmlFor="call-notes" className="text-base font-semibold">
            {t("callNotes")}
          </Label>
          <Textarea
            id="call-notes"
            placeholder={t("callNotesPlaceholder")}
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button
            onClick={handleSaveNotes}
            size="sm"
            disabled={!callNotes || !callLogId}
            variant="outline"
          >
            <Save className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
            {t("saveNotes")}
          </Button>
        </div>
      </div>
    );
  };

  // Handle guest selection (without calling)
  const handleSelectGuest = (guest: Guest) => {
    if (callStatus !== "idle") return; // Don't allow changing guest during call
    setSelectedGuest(guest);
    // Reset RSVP update fields
    setNewRsvpStatus("");
    setNewGuestCount(guest.rsvp?.guestCount || 1);
    setCallNotes("");
    // Open mobile sheet ONLY on mobile devices (less than lg breakpoint)
    if (window.innerWidth < 1024) {
      setIsMobileSheetOpen(true);
    }
  };

  // Handle initiate call from button
  const handleInitiateCall = async () => {
    if (!selectedGuest) {
      toast.error("Please select a guest first");
      return;
    }
    await handleCall(selectedGuest);
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-11.5rem)]" dir={dir}>
        {/* Guest List Sidebar */}
        <Card className="lg:w-[400px] flex flex-col h-full lg:h-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">{t("guests")}</CardTitle>
          <div className="space-y-3 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("searchGuests")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Filters in same row */}
            <div className="grid grid-cols-2 gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("filters.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allStatus")}</SelectItem>
                  <SelectItem value="pending-maybe-declined">{t("filters.pendingMaybeDeclined")}</SelectItem>
                  <SelectItem value="pending">{t("filters.pendingOnly")}</SelectItem>
                  <SelectItem value="maybe">{t("filters.maybeOnly")}</SelectItem>
                  <SelectItem value="confirmed">{t("filters.confirmed")}</SelectItem>
                  <SelectItem value="declined">{t("filters.declinedOnly")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("filters.group")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.allGroups")}</SelectItem>
                  {uniqueGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="has-phone"
                checked={filterHasPhone}
                onChange={(e) => setFilterHasPhone(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="has-phone" className="text-sm text-muted-foreground">
                {t("filters.onlyWithPhone")}
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden pt-0">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2">
              {filteredGuests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("noGuestsFound")}</p>
                </div>
              ) : (
                filteredGuests.map((guest) => (
                  <div
                    key={guest.id}
                    onClick={() => handleSelectGuest(guest)}
                    className={`group relative w-full text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedGuest?.id === guest.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "hover:border-primary/50 hover:bg-accent/50"
                    } ${callStatus !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{guest.name}</p>
                        <p className="text-sm text-muted-foreground truncate" dir="ltr">
                          {guest.phoneNumber || t("noPhone")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {guest.rsvp?.status === "ACCEPTED" && (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            {t("badges.confirmed")}
                          </Badge>
                        )}
                        {guest.rsvp?.status === "MAYBE" && (
                          <Badge variant="secondary">{t("badges.maybe")}</Badge>
                        )}
                        {guest.rsvp?.status === "DECLINED" && (
                          <Badge variant="destructive">{t("badges.declined")}</Badge>
                        )}
                        {guest.phoneNumber && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isConfigured && callStatus === "idle") {
                                handleCall(guest);
                              }
                            }}
                            disabled={!isConfigured || callStatus !== "idle"}
                          >
                            <Phone className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Active Call Panel - Desktop Only */}
      <Card className="hidden lg:flex flex-1 flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl flex items-center justify-between">
            <span>{selectedGuest ? selectedGuest.name : t("guestManager")}</span>
            {selectedGuest && (
              <Badge variant="outline" className="font-normal">
                {selectedGuest.rsvp?.status || t("badges.noRsvp")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto">
          {renderGuestPanelContent()}
        </CardContent>
      </Card>
    </div>

    {/* Mobile Guest Details Sheet */}
    <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
      <SheetContent side="bottom" className="h-[90vh] lg:hidden" dir={dir}>
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center justify-between">
            <span>{selectedGuest?.name || t("guestManager")}</span>
            {selectedGuest && (
              <Badge variant="outline" className="font-normal">
                {selectedGuest.rsvp?.status || t("badges.noRsvp")}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(90vh-80px)] pb-4" dir={dir}>
          <div className={dir === "rtl" ? "pl-4" : "pr-4"}>
            {renderGuestPanelContent()}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

      {/* Call History Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className={`fixed bottom-4 z-50 lg:bottom-4 ${dir === "rtl" ? "right-4 lg:right-4" : "left-4 lg:left-4"}`}>
            <History className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
            {t("callHistory")}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" dir={dir}>
          <SheetHeader>
            <SheetTitle>{t("callHistory")}</SheetTitle>
            <SheetDescription>{t("recentCalls")}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {history.map((call) => (
              <div key={call.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{call.guest.name}</p>
                    <p className="text-sm text-muted-foreground" dir="ltr">{call.phoneNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(call.initiatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge>{call.status}</Badge>
                </div>
                {call.duration && (
                  <p className="text-sm mt-2">
                    {t("duration")}: {formatDuration(call.duration)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
