"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

import {
  getSystemUsageStats,
  getRecentTransactions,
  getTopUsersByCost,
  getCostBreakdownByService,
  getDailyCostTrend,
} from "@/actions/admin-usage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COLORS = {
  whatsapp: "#25D366",
  sms: "#3B82F6",
  voice: "#8B5CF6",
  twilio: "#F22F46",
  upsend: "#10B981",
};

type DateRangeOption = "7d" | "30d" | "90d" | "all";

export function UsageTrackingContent() {
  const t = useTranslations("admin.usageTracking");
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeOption>("30d");
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [serviceBreakdown, setServiceBreakdown] = useState<any>(null);
  const [costTrend, setCostTrend] = useState<any[]>([]);

  const getDateRangeFilter = (range: DateRangeOption) => {
    if (range === "all") return undefined;

    const end = new Date();
    const start = new Date();

    switch (range) {
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
    }

    return { start, end };
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const dateFilter = getDateRangeFilter(dateRange);

        const [statsResult, transactionsResult, topUsersResult, breakdownResult, trendResult] =
          await Promise.all([
            getSystemUsageStats(dateFilter),
            getRecentTransactions(50),
            getTopUsersByCost(dateFilter, 10),
            getCostBreakdownByService(dateFilter),
            getDailyCostTrend(dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90),
          ]);

        if (statsResult.success) setStats(statsResult.stats);
        if (transactionsResult.success) setTransactions(transactionsResult.transactions);
        if (topUsersResult.success) setTopUsers(topUsersResult.users);
        if (breakdownResult.success) setServiceBreakdown(breakdownResult.breakdown);
        if (trendResult.success) setCostTrend(trendResult.trend);
      } catch (error) {
        console.error("Error loading usage data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(amount);
  };

  const getServiceBadgeColor = (service: string) => {
    switch (service) {
      case "whatsapp":
        return "default";
      case "sms":
        return "secondary";
      case "voice":
        return "outline";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const pieData = serviceBreakdown
    ? [
        { name: "WhatsApp", value: serviceBreakdown.whatsapp.cost, color: COLORS.whatsapp },
        { name: "SMS", value: serviceBreakdown.sms.total.cost, color: COLORS.sms },
        { name: "Voice", value: serviceBreakdown.voice.cost, color: COLORS.voice },
      ].filter((item) => item.value > 0)
    : [];

  const smsProviderData = serviceBreakdown
    ? [
        { name: "Twilio", value: serviceBreakdown.sms.twilio.cost, color: COLORS.twilio },
        { name: "Upsend", value: serviceBreakdown.sms.upsend.cost, color: COLORS.upsend },
      ].filter((item) => item.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icons.calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <Icons.refresh className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <Icons.dollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.userCount} users • {stats.eventCount} events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">WhatsApp</CardTitle>
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: COLORS.whatsapp }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.whatsapp.totalCost)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.whatsapp.messageCount.toLocaleString()} messages •{" "}
                {formatCurrency(stats.whatsapp.avgCostPerMessage)}/msg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SMS</CardTitle>
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: COLORS.sms }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.sms.totalCost)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.sms.messageCount.toLocaleString()} messages •{" "}
                {formatCurrency(stats.sms.avgCostPerMessage)}/msg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Voice Calls</CardTitle>
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: COLORS.voice }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.voice.totalCost)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.voice.callCount.toLocaleString()} calls •{" "}
                {stats.voice.totalMinutes.toFixed(1)} min
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Top Users</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cost Trend Chart */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Cost Trend</CardTitle>
                <CardDescription>Daily cost breakdown by service</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={costTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => format(new Date(value), "MMM d")}
                    />
                    <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => format(new Date(label), "PPP")}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="whatsapp"
                      stroke={COLORS.whatsapp}
                      name="WhatsApp"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="sms"
                      stroke={COLORS.sms}
                      name="SMS"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="voice"
                      stroke={COLORS.voice}
                      name="Voice"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Service</CardTitle>
                <CardDescription>Distribution across channels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* SMS Provider Comparison */}
            {smsProviderData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>SMS Provider Comparison</CardTitle>
                  <CardDescription>Twilio vs Upsend</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={smsProviderData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" name="Cost">
                        {smsProviderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Service Statistics */}
            {serviceBreakdown && (
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Service Statistics</CardTitle>
                  <CardDescription>Detailed breakdown by channel</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS.whatsapp }}
                        />
                        <span className="font-semibold">WhatsApp</span>
                      </div>
                      <div className="ml-5 space-y-1 text-sm text-muted-foreground">
                        <div>Messages: {serviceBreakdown.whatsapp.count.toLocaleString()}</div>
                        <div>Total Cost: {formatCurrency(serviceBreakdown.whatsapp.cost)}</div>
                        <div>
                          Avg/Message: {formatCurrency(serviceBreakdown.whatsapp.avgCostPerMessage)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS.sms }}
                        />
                        <span className="font-semibold">SMS</span>
                      </div>
                      <div className="ml-5 space-y-1 text-sm text-muted-foreground">
                        <div>Messages: {serviceBreakdown.sms.total.count.toLocaleString()}</div>
                        <div>Total Cost: {formatCurrency(serviceBreakdown.sms.total.cost)}</div>
                        <div>
                          Avg/Message: {formatCurrency(serviceBreakdown.sms.avgCostPerMessage)}
                        </div>
                        <div className="pt-1">
                          <div className="text-xs">
                            Twilio: {serviceBreakdown.sms.twilio.count} (
                            {formatCurrency(serviceBreakdown.sms.twilio.cost)})
                          </div>
                          <div className="text-xs">
                            Upsend: {serviceBreakdown.sms.upsend.count} (
                            {formatCurrency(serviceBreakdown.sms.upsend.cost)})
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS.voice }}
                        />
                        <span className="font-semibold">Voice</span>
                      </div>
                      <div className="ml-5 space-y-1 text-sm text-muted-foreground">
                        <div>Calls: {serviceBreakdown.voice.callCount.toLocaleString()}</div>
                        <div>
                          Minutes: {serviceBreakdown.voice.totalMinutes.toFixed(1)}
                        </div>
                        <div>Total Cost: {formatCurrency(serviceBreakdown.voice.cost)}</div>
                        <div>Avg/Call: {formatCurrency(serviceBreakdown.voice.avgCostPerCall)}</div>
                        <div>
                          Avg/Min: {formatCurrency(serviceBreakdown.voice.avgCostPerMinute)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Top Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Users by Cost</CardTitle>
              <CardDescription>Highest spending users in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">WhatsApp</TableHead>
                    <TableHead className="text-right">SMS</TableHead>
                    <TableHead className="text-right">Voice</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    topUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.userName}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.userEmail}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.plan}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">
                            {formatCurrency(user.whatsappCost)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {user.whatsappCount} msgs
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{formatCurrency(user.smsCost)}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.smsCount} msgs
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">{formatCurrency(user.voiceCost)}</div>
                          <div className="text-xs text-muted-foreground">
                            {user.voiceCount} calls
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(user.totalCost)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Last 50 cost transactions across all users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No transactions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">
                          {format(new Date(tx.createdAt), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{tx.userName}</div>
                            <div className="text-muted-foreground">{tx.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{tx.eventName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={getServiceBadgeColor(tx.service)}>
                            {tx.service}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm capitalize">{tx.provider}</TableCell>
                        <TableCell className="text-right text-sm">
                          {tx.service === "voice"
                            ? `${(tx.quantity / 60).toFixed(1)}m`
                            : tx.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tx.totalCost)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
