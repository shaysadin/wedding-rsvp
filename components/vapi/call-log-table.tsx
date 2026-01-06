"use client";

import { useState, Fragment } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Maximize2, Minimize2 } from "lucide-react";

interface CallLog {
  id: string;
  vapiCallId: string | null;
  phoneNumber: string;
  status: string;
  duration: number | null;
  rsvpUpdated: boolean;
  rsvpStatus: string | null;
  guestCount: number | null;
  transcript: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  guest: {
    id: string;
    name: string;
  };
}

interface CallLogTableProps {
  callLogs: CallLog[];
  onRefresh: () => void;
}

export function CallLogTable({ callLogs, onRefresh }: CallLogTableProps) {
  const t = useTranslations("voiceAgent.callLog");
  const tc = useTranslations("common");

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30">
            {t("statusCompleted")}
          </Badge>
        );
      case "CALLING":
        return (
          <Badge variant="default" className="bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30 animate-pulse">
            {t("statusCalling")}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary">
            {t("statusPending")}
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive">
            {t("statusFailed")}
          </Badge>
        );
      case "NO_ANSWER":
        return (
          <Badge variant="default" className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
            {t("statusNoAnswer")}
          </Badge>
        );
      case "BUSY":
        return (
          <Badge variant="default" className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30">
            {t("statusBusy")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="secondary">
            {t("statusCancelled")}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Table content component for reuse
  const tableContent = () => (
    <div className="rounded-lg border overflow-hidden">
      <div className={isTableExpanded ? "max-h-[calc(90vh-200px)] overflow-y-auto" : "max-h-[480px] overflow-y-auto"}>
        <Table>
          <TableHeader className="sticky top-0 bg-muted z-10">
            <TableRow>
              <TableHead style={{ width: "15%" }}>{t("guest")}</TableHead>
              <TableHead style={{ width: "15%" }}>{t("phone")}</TableHead>
              <TableHead style={{ width: "12%" }}>{t("status")}</TableHead>
              <TableHead style={{ width: "10%" }}>{t("duration")}</TableHead>
              <TableHead style={{ width: "18%" }}>{t("rsvpResult")}</TableHead>
              <TableHead style={{ width: "22%" }}>{t("date")}</TableHead>
              <TableHead style={{ width: "8%" }}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {callLogs.map((log) => (
              <Fragment key={log.id}>
                <TableRow>
                  <TableCell className="font-medium">{log.guest.name}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-muted-foreground">{log.phoneNumber}</span>
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-muted-foreground">
                      {formatDuration(log.duration)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.rsvpUpdated ? (
                      <Badge
                        variant={log.rsvpStatus === "ACCEPTED" ? "default" : "destructive"}
                      >
                        {log.rsvpStatus}
                        {log.guestCount && ` (${log.guestCount})`}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    {log.transcript && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        {expandedRow === log.id ? (
                          <Icons.chevronUp className="h-4 w-4" />
                        ) : (
                          <Icons.chevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {log.transcript && expandedRow === log.id && (
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={7} className="p-0">
                      <div className="p-4 mx-4 my-3 rounded-lg bg-muted border">
                        <h4 className="text-sm font-medium mb-3 text-violet-600 dark:text-violet-400 flex items-center gap-2">
                          <Icons.messageSquare className="h-4 w-4" />
                          {t("transcript")}
                        </h4>
                        <div
                          className="text-sm text-muted-foreground max-h-48 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed"
                          dir="rtl"
                        >
                          {log.transcript}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <>
    <div className="relative rounded-xl border bg-card shadow-sm">
      {/* Expand Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute end-2 top-2 z-10 h-8 w-8 rounded-md bg-background/80 backdrop-blur-sm hover:bg-muted"
        onClick={() => setIsTableExpanded(true)}
        title={tc("expand")}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
            <Icons.phone className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t("title")}</h3>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="me-8"
        >
          {isRefreshing ? (
            <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.refresh className="me-2 h-4 w-4" />
          )}
          {tc("refresh")}
        </Button>
      </div>

      {/* Content */}
      <div className="p-5">
        {callLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Icons.phone className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p>{t("noCallsYet")}</p>
          </div>
        ) : (
          tableContent()
        )}
      </div>
    </div>

    {/* Expanded Modal */}
    <Dialog open={isTableExpanded} onOpenChange={setIsTableExpanded}>
      <DialogContent size="full" className="flex h-[90vh] max-h-[90vh] flex-col gap-0 [&>div]:p-0">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
              <Icons.phone className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <DialogTitle>{t("title")}</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.refresh className="me-2 h-4 w-4" />
              )}
              {tc("refresh")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsTableExpanded(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
          {callLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icons.phone className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p>{t("noCallsYet")}</p>
            </div>
          ) : (
            tableContent()
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
