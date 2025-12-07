"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserRole } from "@prisma/client";
import { Shield, Users, ArrowLeftRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { switchRole } from "@/actions/role";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RoleSwitcherProps {
  currentRole: UserRole;
  availableRoles: UserRole[];
  expanded?: boolean;
  className?: string;
}

const roleConfig: Record<UserRole, { icon: typeof Shield; labelKey: string; color: string }> = {
  ROLE_PLATFORM_OWNER: {
    icon: Shield,
    labelKey: "admin",
    color: "text-purple-500",
  },
  ROLE_WEDDING_OWNER: {
    icon: Users,
    labelKey: "owner",
    color: "text-blue-500",
  },
};

export function RoleSwitcher({
  currentRole,
  availableRoles,
  expanded = true,
  className,
}: RoleSwitcherProps) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);

  // Get the current locale from the pathname
  const locale = pathname?.split("/")[1] || "he";

  // Only show if user has multiple roles
  if (availableRoles.length <= 1) {
    return null;
  }

  const otherRole = availableRoles.find((role) => role !== currentRole);
  if (!otherRole) return null;

  const currentConfig = roleConfig[currentRole];
  const otherConfig = roleConfig[otherRole];
  const CurrentIcon = currentConfig.icon;
  const OtherIcon = otherConfig.icon;

  const handleSwitch = async () => {
    startTransition(async () => {
      const result = await switchRole(otherRole);

      if (result.success) {
        // Redirect based on the new role (with locale)
        // Add cache-busting timestamp to force fresh request
        const targetPath = otherRole === UserRole.ROLE_PLATFORM_OWNER
          ? `/${locale}/admin`
          : `/${locale}/dashboard`;

        // Force a hard refresh by replacing the entire location
        window.location.replace(targetPath + "?t=" + Date.now());
      }
    });
  };

  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSwitch}
            disabled={isPending}
            className={cn("size-9 shrink-0", className)}
          >
            <ArrowLeftRight className={cn("size-4", isPending && "animate-spin")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {t("switchTo")} {t(otherConfig.labelKey)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleSwitch}
      disabled={isPending}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-full justify-between gap-2 border-dashed transition-all",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {isHovered ? (
          <OtherIcon className={cn("size-4", otherConfig.color)} />
        ) : (
          <CurrentIcon className={cn("size-4", currentConfig.color)} />
        )}
        <span className="text-sm">
          {isHovered
            ? `${t("switchTo")} ${t(otherConfig.labelKey)}`
            : t(currentConfig.labelKey)}
        </span>
      </div>
      <ArrowLeftRight
        className={cn(
          "size-3.5 text-muted-foreground transition-transform",
          isHovered && "rotate-180",
          isPending && "animate-spin"
        )}
      />
    </Button>
  );
}
