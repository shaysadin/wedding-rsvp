"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Users,
  TableProperties,
  UserCheck,
  LayoutGrid,
  List,
  Clock,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { getHostessData } from "@/actions/seating";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HostessGuestList } from "@/components/hostess/hostess-guest-list";
import { HostessFloorPlan } from "@/components/hostess/hostess-floor-plan";
import { HostessTableModal } from "@/components/hostess/hostess-table-modal";

interface Event {
  id: string;
  title: string;
  dateTime: Date | string;
  location: string;
  venue: string | null;
}

interface GuestWithDetails {
  id: string;
  name: string;
  guestCount: number;
  side?: string | null;
  groupName?: string | null;
  tableId: string | null;
  tableName: string | null;
  arrivedAt: Date | string | null;
  arrivedTableId: string | null;
  isArrived: boolean;
}

interface TableWithDetails {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  seatingArrangement?: string;
  colorTheme?: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  seatsUsed: number;
  seatsAvailable: number;
  guestCount: number;
  arrivedCount: number;
  arrivedPeopleCount?: number;
  guests: {
    id: string;
    name: string;
    guestCount: number;
    side?: string | null;
    groupName?: string | null;
    arrivedAt: Date | string | null;
    isArrived: boolean;
  }[];
  isFull: boolean;
}

interface VenueBlock {
  id: string;
  name: string;
  type: string;
  shape: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
}

interface Stats {
  totalGuests: number;
  arrivedGuests: number;
  totalExpected: number;
  tablesCount: number;
}

interface HostessPageContentProps {
  eventId: string;
  initialEvent: Event;
  initialGuests: GuestWithDetails[];
  initialTables: TableWithDetails[];
  initialVenueBlocks: VenueBlock[];
  initialStats: Stats;
  canvasWidth: number;
  canvasHeight: number;
  locale: string;
}

export function HostessPageContent({
  eventId,
  initialEvent,
  initialGuests,
  initialTables,
  initialVenueBlocks,
  initialStats,
  canvasWidth,
  canvasHeight,
  locale,
}: HostessPageContentProps) {
  const isRTL = locale === "he";

  const [event] = useState<Event>(initialEvent);
  const [guests, setGuests] = useState<GuestWithDetails[]>(initialGuests);
  const [tables, setTables] = useState<TableWithDetails[]>(initialTables);
  const [venueBlocks] = useState<VenueBlock[]>(initialVenueBlocks);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("guests");
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);

  // Translations
  const t = {
    guestList: isRTL ? "רשימת אורחים" : "Guest List",
    tableView: isRTL ? "תצוגת שולחנות" : "Table View",
    refresh: isRTL ? "רענן" : "Refresh",
    lastUpdated: isRTL ? "עודכן לאחרונה:" : "Last updated:",
    notArrivedYet: isRTL ? "טרם הגיעו" : "Not Arrived",
    arrived: isRTL ? "הגיעו" : "Arrived",
    tables: isRTL ? "שולחנות" : "Tables",
    expected: isRTL ? "צפויים" : "Expected",
  };

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await getHostessData(eventId);
      if (result.success && result.guests && result.tables && result.stats) {
        setGuests(result.guests as GuestWithDetails[]);
        setTables(result.tables as TableWithDetails[]);
        setStats(result.stats);
        setLastUpdated(new Date());
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת הנתונים" : "Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, [eventId, isRTL]);

  // Format last updated time
  const formatLastUpdated = () => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);

    if (diff < 60) {
      return isRTL ? "לפני פחות מדקה" : "less than a minute ago";
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return isRTL ? `לפני ${minutes} דקות` : `${minutes} minutes ago`;
    } else {
      return lastUpdated.toLocaleTimeString(locale);
    }
  };

  // Handle data refresh event
  useEffect(() => {
    const handleRefresh = () => {
      refreshData();
    };

    window.addEventListener("hostess-data-changed", handleRefresh);
    return () => {
      window.removeEventListener("hostess-data-changed", handleRefresh);
    };
  }, [refreshData]);

  // Real-time polling for production (works with serverless)
  // Polls every 2 seconds to detect changes from other devices
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let lastDataHash = "";

    console.log("[Polling] Starting real-time polling for event", eventId);

    const poll = async () => {
      try {
        // Fetch latest data
        const result = await getHostessData(eventId);

        if (result.success && result.guests) {
          const newGuests = result.guests as GuestWithDetails[];

          // Create a hash of the current state to detect changes
          const dataHash = newGuests
            .map((g) => `${g.id}:${g.arrivedAt}:${g.arrivedTableId}:${g.tableId}`)
            .join("|");

          // Only update if data has actually changed
          if (dataHash !== lastDataHash) {
            console.log("[Polling] 🔄 Data changed, updating...");
            setGuests(newGuests);
            setTables(result.tables as TableWithDetails[]);
            setStats(result.stats);
            setLastUpdated(new Date());
            lastDataHash = dataHash;
          }
        }
      } catch (error) {
        console.error("[Polling] Error:", error);
      }
    };

    // Initial poll
    poll();

    // Poll every 2 seconds for real-time updates
    pollInterval = setInterval(poll, 2000);

    // Cleanup
    return () => {
      console.log("[Polling] Stopping polling");
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [eventId]);

  // Calculate arrival percentage
  const arrivalPercentage = stats.totalGuests > 0
    ? Math.round((stats.arrivedGuests / stats.totalGuests) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900" dir={isRTL ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <div className="bg-gray-600 dark:bg-gray-700 text-white">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3">{event.title}</h1>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-white/90">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="text-sm sm:text-base">
                  {new Date(event.dateTime).toLocaleDateString(locale, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span className="text-sm sm:text-base">
                  {new Date(event.dateTime).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {event.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm sm:text-base">{event.venue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 max-w-6xl -mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {/* Arrived - with progress */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/30 border-green-200 dark:border-green-800 shadow-md">
            <CardContent className="p-3 sm:p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-400">{t.arrived}</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-500">
                    {stats.arrivedGuests}
                  </p>
                </div>
                <div className="p-1.5 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="mt-1.5">
                <Progress value={arrivalPercentage} className="h-1 bg-green-200 dark:bg-green-900" />
                <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">{arrivalPercentage}%</p>
              </div>
            </CardContent>
          </Card>

          {/* Not Arrived Yet */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/30 border-orange-200 dark:border-orange-800 shadow-md">
            <CardContent className="p-3 sm:p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400">{t.notArrivedYet}</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-500">
                    {stats.totalExpected - stats.arrivedGuests}
                  </p>
                </div>
                <div className="p-1.5 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                  <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <div className="mt-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400">
                  {isRTL ? "ממתינים" : "Waiting"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Expected People */}
          <Card className="bg-white dark:bg-zinc-900 shadow-md border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-3 sm:p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t.expected}</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalExpected}</p>
                </div>
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                  <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="mt-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {isRTL ? "אנשים" : "People"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tables */}
          <Card className="bg-white dark:bg-zinc-900 shadow-md border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-3 sm:p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t.tables}</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.tablesCount}</p>
                </div>
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <TableProperties className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {isRTL ? "סידורי ישיבה" : "Seating"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Section */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600">{isRTL ? "חי" : "Live"}</span>
            </div>
            <Clock className="h-3.5 w-3.5" />
            <span>{t.lastUpdated} {formatLastUpdated()}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="min-h-[44px] px-4 rounded-xl border-2 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all"
          >
            <RefreshCw className={cn("h-4 w-4 me-2", isRefreshing && "animate-spin")} />
            {t.refresh}
          </Button>
        </div>

        {/* Tabs */}
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 p-1 h-auto bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <TabsTrigger
                value="guests"
                className={cn(
                  "min-h-[48px] gap-2 rounded-lg font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-violet-700",
                  "dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-violet-400"
                )}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">{t.guestList}</span>
                <span className="sm:hidden">{isRTL ? "אורחים" : "Guests"}</span>
              </TabsTrigger>
              <TabsTrigger
                value="tables"
                className={cn(
                  "min-h-[48px] gap-2 rounded-lg font-medium transition-all",
                  "data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-violet-700",
                  "dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-violet-400"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">{t.tableView}</span>
                <span className="sm:hidden">{isRTL ? "שולחנות" : "Tables"}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guests" className="mt-0">
              <HostessGuestList
                guests={guests}
                tables={tables}
                locale={locale}
              />
            </TabsContent>

            <TabsContent value="tables" className="mt-0">
              <HostessFloorPlan
                tables={tables}
                venueBlocks={venueBlocks}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                locale={locale}
                onTableClick={(id) => setExpandedTableId(id)}
              />
              <HostessTableModal
                table={tables.find((t) => t.id === expandedTableId) || null}
                tables={tables}
                allGuests={guests}
                locale={locale}
                open={!!expandedTableId}
                onClose={() => setExpandedTableId(null)}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
