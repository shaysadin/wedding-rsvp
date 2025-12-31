"use client";

import { useTranslations } from "next-intl";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  DollarSign,
  Building,
  Archive,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type EventArchiveSnapshot } from "@/lib/archive/event-archive-service";

interface ArchiveDetailClientProps {
  snapshot: EventArchiveSnapshot;
  locale: string;
}

export function ArchiveDetailClient({
  snapshot,
  locale,
}: ArchiveDetailClientProps) {
  const t = useTranslations("archives");
  const { event, guests, suppliers, statistics, seating } = snapshot;

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "ILS",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Archive Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="flex items-center gap-3 py-4">
          <Archive className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {t("archivedNotice")}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("archivedOn")}: {formatDate(snapshot.archiveMetadata.archivedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Event Overview */}
      <Card>
        <CardHeader>
          <CardTitle>{t("eventOverview")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(event.dateTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{formatTime(event.dateTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {event.venue ? `${event.venue}, ` : ""}
              {event.location}
            </span>
          </div>
          {event.totalBudget && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>{formatCurrency(event.totalBudget)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("totalGuests")}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5" />
              {statistics.totalGuests}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("accepted")}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              {statistics.acceptedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("declined")}</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              {statistics.declinedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("expectedAttendees")}</CardDescription>
            <CardTitle className="text-2xl">{statistics.totalExpectedAttendees}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs for detailed data */}
      <Tabs defaultValue="guests" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="guests">{t("guestList")}</TabsTrigger>
          <TabsTrigger value="suppliers">{t("suppliers")}</TabsTrigger>
          <TabsTrigger value="seating">{t("seating")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("notifications")}</TabsTrigger>
        </TabsList>

        {/* Guests Tab */}
        <TabsContent value="guests">
          <Card>
            <CardHeader>
              <CardTitle>{t("guestList")}</CardTitle>
              <CardDescription>
                {statistics.totalGuests} {t("guests")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("name")}</TableHead>
                    <TableHead>{t("contact")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("guestCount")}</TableHead>
                    <TableHead>{t("group")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guests.map((guest) => (
                    <TableRow key={guest.id}>
                      <TableCell className="font-medium">{guest.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {guest.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {guest.phoneNumber}
                            </span>
                          )}
                          {guest.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {guest.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            guest.rsvp?.status === "ACCEPTED"
                              ? "default"
                              : guest.rsvp?.status === "DECLINED"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {guest.rsvp?.status || "PENDING"}
                        </Badge>
                      </TableCell>
                      <TableCell>{guest.rsvp?.guestCount || "-"}</TableCell>
                      <TableCell>{guest.groupName || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>{t("suppliers")}</CardTitle>
              <CardDescription>
                {t("totalCost")}: {formatCurrency(statistics.totalSupplierCost)} |{" "}
                {t("paid")}: {formatCurrency(statistics.totalPaidAmount)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {t("noSuppliers")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("name")}</TableHead>
                      <TableHead>{t("category")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("contact")}</TableHead>
                      <TableHead>{t("agreedPrice")}</TableHead>
                      <TableHead>{t("paid")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier, index) => {
                      const paidAmount = supplier.payments.reduce(
                        (sum, p) => sum + p.amount,
                        0
                      );
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              {supplier.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{supplier.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                supplier.status === "COMPLETED"
                                  ? "default"
                                  : supplier.status === "CANCELLED"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {supplier.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {supplier.contactName && (
                                <div>{supplier.contactName}</div>
                              )}
                              {supplier.phoneNumber && (
                                <div className="text-muted-foreground">
                                  {supplier.phoneNumber}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(supplier.agreedPrice)}
                          </TableCell>
                          <TableCell>{formatCurrency(paidAmount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seating Tab */}
        <TabsContent value="seating">
          <Card>
            <CardHeader>
              <CardTitle>{t("seating")}</CardTitle>
              <CardDescription>
                {seating.tables.length} {t("tables")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {seating.tables.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {t("noSeating")}
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {seating.tables.map((table, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{table.name}</CardTitle>
                        <CardDescription>
                          {table.assignments.length}/{table.capacity} {t("seats")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {table.assignments.length > 0 ? (
                          <ul className="text-sm space-y-1">
                            {table.assignments.map((assignment, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                {assignment.guestName}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {t("emptyTable")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t("notifications")}</CardTitle>
              <CardDescription>
                {snapshot.notificationLogs.length} {t("messagesSent")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot.notificationLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  {t("noNotifications")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("guest")}</TableHead>
                      <TableHead>{t("type")}</TableHead>
                      <TableHead>{t("channel")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("sentAt")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshot.notificationLogs.slice(0, 50).map((log, index) => (
                      <TableRow key={index}>
                        <TableCell>{log.guestName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.type}</Badge>
                        </TableCell>
                        <TableCell>{log.channel}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === "SENT" || log.status === "DELIVERED"
                                ? "default"
                                : log.status === "FAILED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.sentAt
                            ? new Date(log.sentAt).toLocaleString(locale)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
