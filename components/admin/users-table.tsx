"use client";

import { useState } from "react";
import { User, UserStatus, PlanTier, WeddingEvent } from "@prisma/client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { approveUser, suspendUser, changeUserPlan } from "@/actions/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/shared/icons";

type UserWithStats = User & {
  _count: { weddingEvents: number };
  weddingEvents: (WeddingEvent & { _count: { guests: number } })[];
  totalGuests: number;
};

interface AdminUsersTableProps {
  users: UserWithStats[];
}

const statusColors: Record<UserStatus, string> = {
  ACTIVE: "bg-green-500/10 text-green-500",
  PENDING_APPROVAL: "bg-yellow-500/10 text-yellow-500",
  SUSPENDED: "bg-red-500/10 text-red-500",
};

const planColors: Record<PlanTier, string> = {
  FREE: "bg-gray-500/10 text-gray-500",
  BASIC: "bg-blue-500/10 text-blue-500",
  PREMIUM: "bg-purple-500/10 text-purple-500",
};

export function AdminUsersTable({ users }: AdminUsersTableProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tPlans = useTranslations("plans");
  const tStatus = useTranslations("status");
  const ts = useTranslations("success");
  const [loading, setLoading] = useState<string | null>(null);

  const handleStatusChange = async (userId: string, action: "approve" | "suspend") => {
    setLoading(userId);
    const result = action === "approve"
      ? await approveUser(userId)
      : await suspendUser(userId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("saved"));
    }
  };

  const handlePlanChange = async (userId: string, plan: PlanTier) => {
    setLoading(userId);
    const result = await changeUserPlan(userId, plan);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("saved"));
    }
  };

  if (users.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">{tc("noResults")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tc("user")}</TableHead>
            <TableHead>{tc("status")}</TableHead>
            <TableHead>{tc("plan")}</TableHead>
            <TableHead className="text-center">{tc("events")}</TableHead>
            <TableHead className="text-center">{tc("guests")}</TableHead>
            <TableHead className="text-end">{tc("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || ""} alt={user.name || ""} />
                    <AvatarFallback>
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[user.status]} variant="secondary">
                  {tStatus(user.status.toLowerCase() as "active" | "pendingApproval" | "suspended")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={planColors[user.plan]} variant="secondary">
                  {tPlans(user.plan.toLowerCase() as "free" | "basic" | "premium")}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                {user._count.weddingEvents}
              </TableCell>
              <TableCell className="text-center">
                {user.totalGuests}
              </TableCell>
              <TableCell className="text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={loading === user.id}>
                      {loading === user.id ? (
                        <Icons.spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icons.ellipsis className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{tc("actions")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {user.status === UserStatus.PENDING_APPROVAL && (
                      <DropdownMenuItem onClick={() => handleStatusChange(user.id, "approve")}>
                        <Icons.check className="me-2 h-4 w-4" />
                        {t("approveUser")}
                      </DropdownMenuItem>
                    )}

                    {user.status === UserStatus.ACTIVE && (
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(user.id, "suspend")}
                        className="text-destructive"
                      >
                        <Icons.close className="me-2 h-4 w-4" />
                        {t("suspendUser")}
                      </DropdownMenuItem>
                    )}

                    {user.status === UserStatus.SUSPENDED && (
                      <DropdownMenuItem onClick={() => handleStatusChange(user.id, "approve")}>
                        <Icons.check className="me-2 h-4 w-4" />
                        {tc("reactivate")}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>{t("changePlan")}</DropdownMenuLabel>

                    {Object.values(PlanTier).map((plan) => (
                      <DropdownMenuItem
                        key={plan}
                        onClick={() => handlePlanChange(user.id, plan)}
                        disabled={user.plan === plan}
                      >
                        <Badge className={planColors[plan]} variant="secondary">
                          {tPlans(plan.toLowerCase() as "free" | "basic" | "premium")}
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
