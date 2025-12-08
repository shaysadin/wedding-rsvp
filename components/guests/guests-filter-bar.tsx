"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/shared/icons";
import { Badge } from "@/components/ui/badge";

export type SideFilter = string; // Changed to string to support custom sides
export type GroupFilter = string; // Changed to string to support custom groups

const PREDEFINED_SIDES = ["bride", "groom", "both"] as const;
export type MessageStatusFilter = "all" | "not_sent" | "invite_sent" | "reminder_sent";
export type RsvpStatusFilter = "all" | "pending" | "accepted" | "declined";

const PREDEFINED_GROUPS = ["family", "friends", "work", "other"] as const;

interface GuestsFilterBarProps {
  sideFilter: SideFilter;
  setSideFilter: (value: SideFilter) => void;
  groupFilter: GroupFilter;
  setGroupFilter: (value: GroupFilter) => void;
  messageStatusFilter: MessageStatusFilter;
  setMessageStatusFilter: (value: MessageStatusFilter) => void;
  rsvpStatusFilter: RsvpStatusFilter;
  setRsvpStatusFilter: (value: RsvpStatusFilter) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  customGroups?: string[];
  customSides?: string[];
}

export function GuestsFilterBar({
  sideFilter,
  setSideFilter,
  groupFilter,
  setGroupFilter,
  messageStatusFilter,
  setMessageStatusFilter,
  rsvpStatusFilter,
  setRsvpStatusFilter,
  onClearFilters,
  activeFilterCount,
  customGroups = [],
  customSides = [],
}: GuestsFilterBarProps) {
  const t = useTranslations("guests");
  const tc = useTranslations("common");
  const tStatus = useTranslations("status");
  const tMsg = useTranslations("messageStatus");

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="flex items-center gap-2 pb-2 sm:flex-wrap sm:pb-0">
      {/* Side Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1">
            <Icons.users className="h-3.5 w-3.5" />
            {t("side")}
            {sideFilter !== "all" && (
              <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-xs">
                {PREDEFINED_SIDES.includes(sideFilter as typeof PREDEFINED_SIDES[number])
                  ? t(`sides.${sideFilter}` as "sides.bride" | "sides.groom" | "sides.both")
                  : sideFilter}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>{t("side")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={sideFilter === "all"}
            onCheckedChange={() => setSideFilter("all")}
          >
            {tc("all") || "הכל"}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={sideFilter === "bride"}
            onCheckedChange={() => setSideFilter("bride")}
          >
            {t("sides.bride")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={sideFilter === "groom"}
            onCheckedChange={() => setSideFilter("groom")}
          >
            {t("sides.groom")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={sideFilter === "both"}
            onCheckedChange={() => setSideFilter("both")}
          >
            {t("sides.both")}
          </DropdownMenuCheckboxItem>
          {customSides.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {customSides.map((side) => (
                <DropdownMenuCheckboxItem
                  key={side}
                  checked={sideFilter === side}
                  onCheckedChange={() => setSideFilter(side)}
                >
                  {side}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Group Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1">
            <Icons.folder className="h-3.5 w-3.5" />
            {t("group")}
            {groupFilter !== "all" && (
              <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-xs">
                {PREDEFINED_GROUPS.includes(groupFilter as typeof PREDEFINED_GROUPS[number])
                  ? t(`groups.${groupFilter}` as "groups.family" | "groups.friends" | "groups.work" | "groups.other")
                  : groupFilter}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>{t("group")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={groupFilter === "all"}
            onCheckedChange={() => setGroupFilter("all")}
          >
            {tc("all") || "הכל"}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={groupFilter === "family"}
            onCheckedChange={() => setGroupFilter("family")}
          >
            {t("groups.family")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={groupFilter === "friends"}
            onCheckedChange={() => setGroupFilter("friends")}
          >
            {t("groups.friends")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={groupFilter === "work"}
            onCheckedChange={() => setGroupFilter("work")}
          >
            {t("groups.work")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={groupFilter === "other"}
            onCheckedChange={() => setGroupFilter("other")}
          >
            {t("groups.other")}
          </DropdownMenuCheckboxItem>
          {customGroups.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {customGroups.map((group) => (
                <DropdownMenuCheckboxItem
                  key={group}
                  checked={groupFilter === group}
                  onCheckedChange={() => setGroupFilter(group)}
                >
                  {group}
                </DropdownMenuCheckboxItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* RSVP Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1">
            <Icons.check className="h-3.5 w-3.5" />
            {t("status")}
            {rsvpStatusFilter !== "all" && (
              <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-xs">
                {tStatus(rsvpStatusFilter as "pending" | "accepted" | "declined")}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel>{t("status")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={rsvpStatusFilter === "all"}
            onCheckedChange={() => setRsvpStatusFilter("all")}
          >
            {tc("all") || "הכל"}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={rsvpStatusFilter === "pending"}
            onCheckedChange={() => setRsvpStatusFilter("pending")}
          >
            {tStatus("pending")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={rsvpStatusFilter === "accepted"}
            onCheckedChange={() => setRsvpStatusFilter("accepted")}
          >
            {tStatus("accepted")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={rsvpStatusFilter === "declined"}
            onCheckedChange={() => setRsvpStatusFilter("declined")}
          >
            {tStatus("declined")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Message Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 shrink-0 gap-1">
            <Icons.messageSquare className="h-3.5 w-3.5" />
            {t("messageSent")}
            {messageStatusFilter !== "all" && (
              <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-xs">
                {messageStatusFilter === "not_sent" && tMsg("notSent")}
                {messageStatusFilter === "invite_sent" && tMsg("inviteSent")}
                {messageStatusFilter === "reminder_sent" && tMsg("reminder1")}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>{t("messageSent")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={messageStatusFilter === "all"}
            onCheckedChange={() => setMessageStatusFilter("all")}
          >
            {tc("all") || "הכל"}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={messageStatusFilter === "not_sent"}
            onCheckedChange={() => setMessageStatusFilter("not_sent")}
          >
            {tMsg("notSent")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={messageStatusFilter === "invite_sent"}
            onCheckedChange={() => setMessageStatusFilter("invite_sent")}
          >
            {tMsg("inviteSent")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={messageStatusFilter === "reminder_sent"}
            onCheckedChange={() => setMessageStatusFilter("reminder_sent")}
          >
            {tMsg("reminder1")}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1 text-muted-foreground"
          onClick={onClearFilters}
        >
          <Icons.x className="h-3.5 w-3.5" />
          {t("clearFilters")}
          <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-xs">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
      </div>
    </div>
  );
}
