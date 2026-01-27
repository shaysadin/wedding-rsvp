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
import { VoiceProcessor, type VoicePreset } from "@/lib/twilio-voice/voice-processor";
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
}

export function CallCenterClient({ eventId, locale, initialGuests, initialHistory }: Props) {
  // State
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [history, setHistory] = useState<CallLog[]>(initialHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

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

  // Refs
  const deviceRef = useRef<Device | null>(null);
  const voiceProcessorRef = useRef<VoiceProcessor | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Twilio Device
  useEffect(() => {
    initializeTwilioDevice();
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
      if (voiceProcessorRef.current) {
        voiceProcessorRef.current.dispose();
      }
    };
  }, []);

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
      // Get capability token
      const response = await fetch("/api/twilio-voice/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get token");
      }

      const { token } = await response.json();

      // Create Device
      const device = new Device(token);

      // Setup event listeners
      device.on("registered", () => {
        console.log("Twilio Device registered");
      });

      device.on("error", (error: any) => {
        console.error("Twilio Device error:", error);
        toast.error("Device error: " + error.message);
      });

      // Register device
      await device.register();
      deviceRef.current = device;

      toast.success("Call center initialized");
    } catch (error: any) {
      console.error("Failed to initialize device:", error);
      toast.error("Failed to initialize call center: " + error.message);
    }
  }

  async function handleCall(guest: Guest) {
    if (!guest.phoneNumber) {
      toast.error("Guest has no phone number");
      return;
    }

    if (!deviceRef.current) {
      toast.error("Device not initialized");
      return;
    }

    try {
      setSelectedGuest(guest);
      setCallStatus("initiating");

      // Create call log
      const result = await initiateCall({ eventId, guestId: guest.id, locale });

      if (!result.success || !result.callLog) {
        throw new Error(result.error || "Failed to initiate call");
      }

      setCallLogId(result.callLog.id);

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Initialize voice processor
      const processor = new VoiceProcessor();
      const processedStream = await processor.initialize(stream);
      voiceProcessorRef.current = processor;

      // Make call with processed audio
      const call = await deviceRef.current.connect({
        params: {
          To: guest.phoneNumber,
        },
        rtcConfiguration: {
          // Use processed stream
          // @ts-ignore
          audioContext: processor,
        },
      });

      setCurrentCall(call);
      setCallStatus("ringing");

      // Update call log with Twilio SID
      await updateCallSid(result.callLog.id, call.parameters.CallSid);

      // Call event listeners
      call.on("accept", () => {
        setCallStatus("connected");
        toast.success(`Connected to ${guest.name}`);
      });

      call.on("disconnect", () => {
        handleEndCall();
      });

      call.on("cancel", () => {
        setCallStatus("idle");
        toast.info("Call cancelled");
      });

      call.on("error", (error: any) => {
        console.error("Call error:", error);
        toast.error("Call error: " + error.message);
        handleEndCall();
      });
    } catch (error: any) {
      console.error("Failed to initiate call:", error);
      toast.error(error.message || "Failed to initiate call");
      setCallStatus("idle");
      setSelectedGuest(null);
    }
  }

  function handleEndCall() {
    if (currentCall) {
      currentCall.disconnect();
    }

    if (voiceProcessorRef.current) {
      voiceProcessorRef.current.dispose();
      voiceProcessorRef.current = null;
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
    if (voiceProcessorRef.current) {
      voiceProcessorRef.current.applyPreset(preset);
      setVoicePreset(preset);
      toast.success(`Voice changed to ${preset}`);
    }
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
    if (!callLogId || !selectedGuest || !newRsvpStatus) return;

    const result = await updateRsvpFromCall({
      callLogId,
      guestId: selectedGuest.id,
      newRsvpStatus: newRsvpStatus as any,
      eventId,
      locale,
    });

    if (result.success) {
      toast.success("RSVP updated");
      setNewRsvpStatus("");
    } else {
      toast.error(result.error || "Failed to update RSVP");
    }
  }

  // Filter guests
  const filteredGuests = guests.filter((guest) => {
    const matchesSearch = guest.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "pending" && (!guest.rsvp || guest.rsvp.status === "PENDING")) ||
      (filterStatus === "confirmed" && guest.rsvp?.status === "ACCEPTED") ||
      (filterStatus === "declined" && guest.rsvp?.status === "DECLINED");
    return matchesSearch && matchesFilter;
  });

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Guest List Sidebar */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Guests</CardTitle>
          <div className="space-y-2 mt-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Guests</SelectItem>
                <SelectItem value="pending">Pending RSVP</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {filteredGuests.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => guest.phoneNumber && handleCall(guest)}
                  disabled={!guest.phoneNumber || callStatus !== "idle"}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{guest.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {guest.phoneNumber || "No phone"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {guest.rsvp?.status === "ACCEPTED" && (
                        <Badge variant="success">Confirmed</Badge>
                      )}
                      {guest.phoneNumber && (
                        <Phone className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Active Call Panel */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>
            {callStatus === "idle" ? "No Active Call" : `Call: ${selectedGuest?.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {callStatus === "idle" ? (
            <div className="text-center py-12 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a guest from the list to start calling</p>
            </div>
          ) : (
            <>
              {/* Call Info */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Guest</p>
                  <p className="font-semibold">{selectedGuest?.name}</p>
                  <p className="text-sm">{selectedGuest?.phoneNumber}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge>{callStatus}</Badge>
                  {callStatus === "connected" && (
                    <p className="text-sm font-mono">{formatDuration(callDuration)}</p>
                  )}
                </div>
              </div>

              {/* Call Controls */}
              <div className="flex gap-2 justify-center">
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  size="lg"
                  onClick={handleMuteToggle}
                  disabled={callStatus !== "connected"}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  End Call
                </Button>
              </div>

              {/* Voice Changer */}
              <div className="space-y-3">
                <Label>Voice Effect</Label>
                <div className="flex gap-2 flex-wrap">
                  {(["normal", "deep", "high", "robot", "elderly"] as VoicePreset[]).map((preset) => (
                    <Button
                      key={preset}
                      variant={voicePreset === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleVoiceChange(preset)}
                      disabled={callStatus !== "connected"}
                      className="capitalize"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Call Notes */}
              <div className="space-y-3">
                <Label htmlFor="call-notes">Call Notes</Label>
                <Textarea
                  id="call-notes"
                  placeholder="Enter notes about this call..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  rows={4}
                />
                <Button onClick={handleSaveNotes} size="sm" disabled={!callNotes}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notes
                </Button>
              </div>

              {/* Update RSVP */}
              <div className="space-y-3">
                <Label htmlFor="rsvp-status">Update RSVP Status</Label>
                <div className="flex gap-2">
                  <Select value={newRsvpStatus} onValueChange={setNewRsvpStatus}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="DECLINED">Declined</SelectItem>
                      <SelectItem value="MAYBE">Maybe</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateRsvp} disabled={!newRsvpStatus}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Update
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Call History Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="fixed bottom-4 right-4">
            <History className="h-4 w-4 mr-2" />
            Call History
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Call History</SheetTitle>
            <SheetDescription>Recent calls for this event</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {history.map((call) => (
              <div key={call.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{call.guest.name}</p>
                    <p className="text-sm text-muted-foreground">{call.phoneNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(call.initiatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge>{call.status}</Badge>
                </div>
                {call.duration && (
                  <p className="text-sm mt-2">
                    Duration: {formatDuration(call.duration)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
