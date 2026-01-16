"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  TrendingUp
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
import { HostessTableView } from "@/components/hostess/hostess-table-view";

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
  initialStats: Stats;
  locale: string;
}

export function HostessPageContent({
  eventId,
  initialEvent,
  initialGuests,
  initialTables,
  initialStats,
  locale,
}: HostessPageContentProps) {
  const isRTL = locale === "he";

  const [event] = useState<Event>(initialEvent);
  const [guests, setGuests] = useState<GuestWithDetails[]>(initialGuests);
  const [tables, setTables] = useState<TableWithDetails[]>(initialTables);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<string>("guests");

  // Translations
  const t = {
    guestList: isRTL ? "רשימת אורחים" : "Guest List",
    tableView: isRTL ? "תצוגת שולחנות" : "Table View",
    refresh: isRTL ? "רענן" : "Refresh",
    lastUpdated: isRTL ? "עודכן לאחרונה:" : "Last updated:",
    totalGuests: isRTL ? 'סה"כ אורחים' : "Total Guests",
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

  // Calculate arrival percentage
  const arrivalPercentage = stats.totalGuests > 0
    ? Math.round((stats.arrivedGuests / stats.totalGuests) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900" dir={isRTL ? "rtl" : "ltr"}>
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
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
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 max-w-6xl -mt-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6"
        >
          {/* Arrived - Main stat with progress */}
          <Card className="col-span-2 lg:col-span-1 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/30 border-green-200 dark:border-green-800 shadow-lg">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-400">{t.arrived}</p>
                  <p className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-500">
                    {stats.arrivedGuests}
                  </p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-xl">
                  <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-green-600 dark:text-green-400">
                    {isRTL ? `${arrivalPercentage}% מהאורחים` : `${arrivalPercentage}% of guests`}
                  </span>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                </div>
                <Progress value={arrivalPercentage} className="h-2 bg-green-200 dark:bg-green-900" />
              </div>
            </CardContent>
          </Card>

          {/* Total Guests */}
          <Card className="bg-white dark:bg-zinc-900 shadow-lg border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.totalGuests}</p>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.totalGuests}</p>
                </div>
                <div className="p-2 bg-violet-100 dark:bg-violet-900/50 rounded-xl">
                  <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {isRTL ? "רשימות" : "Invitations"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Expected People */}
          <Card className="bg-white dark:bg-zinc-900 shadow-lg border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.expected}</p>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.totalExpected}</p>
                </div>
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                  <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {isRTL ? "אנשים" : "People"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tables */}
          <Card className="bg-white dark:bg-zinc-900 shadow-lg border-zinc-200 dark:border-zinc-800">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t.tables}</p>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.tablesCount}</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <TableProperties className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  {isRTL ? "סידורי ישיבה" : "Seating"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Refresh Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-between mb-4 px-1"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
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
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
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

            <AnimatePresence mode="wait">
              <TabsContent value="guests" className="mt-0">
                <motion.div
                  key="guests"
                  initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? -10 : 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <HostessGuestList
                    guests={guests}
                    tables={tables}
                    locale={locale}
                  />
                </motion.div>
              </TabsContent>

              <TabsContent value="tables" className="mt-0">
                <motion.div
                  key="tables"
                  initial={{ opacity: 0, x: isRTL ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 10 : -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <HostessTableView
                    tables={tables}
                    locale={locale}
                  />
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>
        </motion.div>

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
