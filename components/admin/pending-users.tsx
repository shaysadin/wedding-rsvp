"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { approveUser, suspendUser } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/shared/icons";

interface AdminPendingUsersProps {
  users: User[];
}

export function AdminPendingUsers({ users }: AdminPendingUsersProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const ts = useTranslations("success");
  const [loading, setLoading] = useState<string | null>(null);

  const handleApprove = async (userId: string) => {
    setLoading(userId);
    const result = await approveUser(userId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("saved"));
    }
  };

  const handleReject = async (userId: string) => {
    setLoading(userId);
    const result = await suspendUser(userId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("saved"));
    }
  };

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {tc("noResults")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center gap-4">
            <Avatar>
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

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleApprove(user.id)}
              disabled={loading === user.id}
            >
              {loading === user.id ? (
                <Icons.spinner className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Icons.check className="me-2 h-4 w-4" />
                  {t("approveUser")}
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleReject(user.id)}
              disabled={loading === user.id}
            >
              <Icons.close className="me-2 h-4 w-4" />
              {tc("reject")}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
