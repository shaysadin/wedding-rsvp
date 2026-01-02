"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { GiftPaymentStatus } from "@prisma/client";

import { getAdminPayments, exportPaymentsCsv } from "@/actions/gift-payments";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons } from "@/components/shared/icons";
import { PageFadeIn } from "@/components/shared/page-fade-in";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  serviceFee: number;
  totalCharged: number;
  status: GiftPaymentStatus;
  guestName: string | null;
  eventTitle: string;
  eventOwner: string;
  createdAt: string;
  paidAt: string | null;
}

export default function AdminPaymentsPage() {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getAdminPayments(
        statusFilter !== "all" ? { status: statusFilter as GiftPaymentStatus } : undefined
      );

      if (result.error) {
        toast.error(result.error);
      } else if (result.payments) {
        setPayments(result.payments as unknown as Payment[]);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת התשלומים" : "Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, isRTL]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportPaymentsCsv();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.csv) {
        // Create download
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
        link.click();
        toast.success(isRTL ? "הייצוא הושלם" : "Export completed");
      }
    } catch {
      toast.error(isRTL ? "שגיאה בייצוא" : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Stats
  const totalTransactions = payments.length;
  const completedPayments = payments.filter((p) => p.status === "COMPLETED");
  const totalVolume = completedPayments.reduce((sum, p) => sum + p.totalCharged, 0);
  const platformFees = completedPayments.reduce((sum, p) => sum + p.serviceFee, 0);
  const pendingPayments = payments.filter(
    (p) => p.status === "PENDING" || p.status === "PROCESSING"
  );

  const getStatusBadge = (status: GiftPaymentStatus) => {
    const variants: Record<GiftPaymentStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: { en: string; he: string } }> = {
      PENDING: { variant: "secondary", label: { en: "Pending", he: "ממתין" } },
      PROCESSING: { variant: "outline", label: { en: "Processing", he: "בעיבוד" } },
      COMPLETED: { variant: "default", label: { en: "Completed", he: "הושלם" } },
      FAILED: { variant: "destructive", label: { en: "Failed", he: "נכשל" } },
      REFUNDED: { variant: "outline", label: { en: "Refunded", he: "הוחזר" } },
    };

    const config = variants[status];
    return (
      <Badge variant={config.variant}>
        {isRTL ? config.label.he : config.label.en}
      </Badge>
    );
  };

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={isRTL ? "תשלומים" : "Payments"}
        text={isRTL ? "צפייה בכל תשלומי המתנות בפלטפורמה" : "View all gift payments on the platform"}
      >
        <Button onClick={handleExport} disabled={isExporting} variant="outline">
          {isExporting ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.download className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
          )}
          {isRTL ? "ייצוא CSV" : "Export CSV"}
        </Button>
      </DashboardHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "סה״כ עסקאות" : "Total Transactions"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "סה״כ נפח" : "Total Volume"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalVolume, "ILS")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "עמלות פלטפורמה" : "Platform Fees"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(platformFees, "ILS")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{isRTL ? "ממתין לעיבוד" : "Pending"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {pendingPayments.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={isRTL ? "סינון לפי סטטוס" : "Filter by status"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isRTL ? "הכל" : "All"}</SelectItem>
            <SelectItem value="PENDING">{isRTL ? "ממתין" : "Pending"}</SelectItem>
            <SelectItem value="PROCESSING">{isRTL ? "בעיבוד" : "Processing"}</SelectItem>
            <SelectItem value="COMPLETED">{isRTL ? "הושלם" : "Completed"}</SelectItem>
            <SelectItem value="FAILED">{isRTL ? "נכשל" : "Failed"}</SelectItem>
            <SelectItem value="REFUNDED">{isRTL ? "הוחזר" : "Refunded"}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isRTL ? "עסקאות" : "Transactions"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icons.creditCard className="h-12 w-12 mx-auto mb-4" />
              <p>{isRTL ? "אין תשלומים עדיין" : "No payments yet"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? "אירוע" : "Event"}</TableHead>
                    <TableHead>{isRTL ? "אורח" : "Guest"}</TableHead>
                    <TableHead>{isRTL ? "סכום" : "Amount"}</TableHead>
                    <TableHead>{isRTL ? "עמלה" : "Fee"}</TableHead>
                    <TableHead>{isRTL ? "סה״כ" : "Total"}</TableHead>
                    <TableHead>{isRTL ? "סטטוס" : "Status"}</TableHead>
                    <TableHead>{isRTL ? "תאריך" : "Date"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.eventTitle}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.eventOwner}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.guestName || (isRTL ? "אנונימי" : "Anonymous")}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                      <TableCell className="text-blue-600">
                        {formatCurrency(payment.serviceFee, payment.currency)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.totalCharged, payment.currency)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(payment.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageFadeIn>
  );
}
