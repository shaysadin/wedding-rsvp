"use client";

import { useState } from "react";
import { User, UserStatus, UserRole, PlanTier, UsageTracking, VapiPhoneNumber } from "@prisma/client";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { reactivateUser, suspendUser, changeUserPlan, resetUserUsage, adjustCredits, toggleUserAdminRole } from "@/actions/admin";
import { assignPhoneNumberToUser } from "@/actions/vapi/phone-numbers";
import { assignWhatsAppPhoneNumberToUser } from "@/actions/whatsapp-phone-numbers";
import { PlanLimits } from "@/config/plans";
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Icons } from "@/components/shared/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

type UserWithStats = User & {
  _count: { weddingEvents: number };
  weddingEvents: { id: string; title: string; _count: { guests: number } }[];
  totalGuests: number;
  usageTracking: UsageTracking | null;
  planLimits: PlanLimits;
  roles: UserRole[];
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  vapiPhoneNumber: VapiPhoneNumber | null;
  whatsappPhoneNumberId: string | null;
};

type PhoneNumberOption = {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  isDefault: boolean;
};

interface AdminUsersTableProps {
  users: UserWithStats[];
  vapiPhoneNumbers?: PhoneNumberOption[];
  whatsappPhoneNumbers?: PhoneNumberOption[];
}

const statusColors: Record<UserStatus, string> = {
  PENDING_APPROVAL: "bg-yellow-500/10 text-yellow-500", // Legacy status - for backward compatibility
  ACTIVE: "bg-green-500/10 text-green-500",
  SUSPENDED: "bg-red-500/10 text-red-500",
};

const planColors: Record<PlanTier, string> = {
  FREE: "bg-gray-500/10 text-gray-500",
  BASIC: "bg-blue-500/10 text-blue-500",
  ADVANCED: "bg-indigo-500/10 text-indigo-500",
  PREMIUM: "bg-purple-500/10 text-purple-500",
  BUSINESS: "bg-amber-500/10 text-amber-500",
};

export function AdminUsersTable({ users, vapiPhoneNumbers = [], whatsappPhoneNumbers = [] }: AdminUsersTableProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tPlans = useTranslations("plans");
  const tStatus = useTranslations("status");
  const ts = useTranslations("success");
  const [loading, setLoading] = useState<string | null>(null);
  const [userVapiPhoneNumbers, setUserVapiPhoneNumbers] = useState<Record<string, string | null>>(
    Object.fromEntries(users.map(u => [u.id, u.vapiPhoneNumberId]))
  );
  const [userWhatsappPhoneNumbers, setUserWhatsappPhoneNumbers] = useState<Record<string, string | null>>(
    Object.fromEntries(users.map(u => [u.id, u.whatsappPhoneNumberId]))
  );

  // Unified credits dialog state
  const [creditsDialog, setCreditsDialog] = useState<{
    open: boolean;
    userId: string;
    userName: string;
    currentWhatsappBonus: number;
    currentSmsBonus: number;
    currentVoiceCallsBonus: number;
  }>({
    open: false,
    userId: "",
    userName: "",
    currentWhatsappBonus: 0,
    currentSmsBonus: 0,
    currentVoiceCallsBonus: 0,
  });
  const [creditsWhatsapp, setCreditsWhatsapp] = useState("");
  const [creditsSms, setCreditsSms] = useState("");
  const [creditsVoiceCalls, setCreditsVoiceCalls] = useState("");
  const [isRemoveMode, setIsRemoveMode] = useState(false);

  const handleStatusChange = async (userId: string, action: "reactivate" | "suspend") => {
    setLoading(userId);
    const result = action === "reactivate"
      ? await reactivateUser(userId)
      : await suspendUser(userId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("saved"));
    }
  };

  const handlePlanChange = async (userId: string, plan: PlanTier, resetUsage: boolean = false, syncWithStripe: boolean = false) => {
    setLoading(userId);
    const result = await changeUserPlan(userId, plan, resetUsage, syncWithStripe);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("saved"));
    }
  };

  const handleResetUsage = async (userId: string) => {
    setLoading(userId);
    const result = await resetUserUsage(userId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("saved"));
    }
  };

  const handleManageCredits = async () => {
    if (!creditsDialog.userId) return;

    const whatsappValue = parseInt(creditsWhatsapp) || 0;
    const smsValue = parseInt(creditsSms) || 0;
    const voiceCallsValue = parseInt(creditsVoiceCalls) || 0;

    // Apply the adjustment (negative if remove mode)
    const whatsappAdjustment = isRemoveMode ? -whatsappValue : whatsappValue;
    const smsAdjustment = isRemoveMode ? -smsValue : smsValue;
    const voiceCallsAdjustment = isRemoveMode ? -voiceCallsValue : voiceCallsValue;

    setLoading(creditsDialog.userId);
    const result = await adjustCredits(
      creditsDialog.userId,
      whatsappAdjustment,
      smsAdjustment,
      voiceCallsAdjustment
    );
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(ts("saved"));
      closeCreditsDialog();
    }
  };

  const closeCreditsDialog = () => {
    setCreditsDialog({ open: false, userId: "", userName: "", currentWhatsappBonus: 0, currentSmsBonus: 0, currentVoiceCallsBonus: 0 });
    setCreditsWhatsapp("");
    setCreditsSms("");
    setCreditsVoiceCalls("");
    setIsRemoveMode(false);
  };

  const openCreditsDialog = (userId: string, userName: string, whatsappBonus: number, smsBonus: number, voiceCallsBonus: number) => {
    setCreditsDialog({
      open: true,
      userId,
      userName,
      currentWhatsappBonus: whatsappBonus,
      currentSmsBonus: smsBonus,
      currentVoiceCallsBonus: voiceCallsBonus,
    });
    setCreditsWhatsapp("");
    setCreditsSms("");
    setCreditsVoiceCalls("");
    setIsRemoveMode(false);
  };

  // Calculate new bonus values based on current input and mode
  const getNewBonusValues = () => {
    const whatsappValue = parseInt(creditsWhatsapp) || 0;
    const smsValue = parseInt(creditsSms) || 0;
    const voiceCallsValue = parseInt(creditsVoiceCalls) || 0;

    if (isRemoveMode) {
      return {
        whatsapp: Math.max(0, creditsDialog.currentWhatsappBonus - whatsappValue),
        sms: Math.max(0, creditsDialog.currentSmsBonus - smsValue),
        voiceCalls: Math.max(0, creditsDialog.currentVoiceCallsBonus - voiceCallsValue),
      };
    } else {
      return {
        whatsapp: creditsDialog.currentWhatsappBonus + whatsappValue,
        sms: creditsDialog.currentSmsBonus + smsValue,
        voiceCalls: creditsDialog.currentVoiceCallsBonus + voiceCallsValue,
      };
    }
  };

  const handleToggleAdminRole = async (userId: string) => {
    setLoading(userId);
    const result = await toggleUserAdminRole(userId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.hasAdminRole ? t("adminRoleGranted") : t("adminRoleRevoked"));
    }
  };

  const handleAssignVapiPhoneNumber = async (userId: string, phoneNumberId: string | null) => {
    setLoading(userId);
    const result = await assignPhoneNumberToUser(userId, phoneNumberId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      setUserVapiPhoneNumbers(prev => ({ ...prev, [userId]: phoneNumberId }));
      toast.success(phoneNumberId ? t("phoneAssigned") : t("phoneUnassigned"));
    }
  };

  const handleAssignWhatsappPhoneNumber = async (userId: string, phoneNumberId: string | null) => {
    setLoading(userId);
    const result = await assignWhatsAppPhoneNumberToUser(userId, phoneNumberId);
    setLoading(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      setUserWhatsappPhoneNumbers(prev => ({ ...prev, [userId]: phoneNumberId }));
      toast.success(phoneNumberId ? t("phoneAssigned") : t("phoneUnassigned"));
    }
  };

  const getUsagePercent = (sent: number, limit: number, bonus: number = 0) => {
    const total = limit + bonus;
    if (total === 0) return 0;
    return Math.min(100, Math.round((sent / total) * 100));
  };

  if (users.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">{tc("noResults")}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tc("user")}</TableHead>
              <TableHead>{tc("status")}</TableHead>
              <TableHead>{tc("plan")}</TableHead>
              <TableHead className="text-center">{tc("events")}</TableHead>
              <TableHead className="text-center">{tc("guests")}</TableHead>
              <TableHead>{t("usage")}</TableHead>
              <TableHead className="text-end">{tc("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const usage = user.usageTracking;
              const whatsappSent = usage?.whatsappSent || 0;
              const smsSent = usage?.smsSent || 0;
              const voiceCallsMade = usage?.voiceCallsMade || 0;
              const whatsappBonus = usage?.whatsappBonus || 0;
              const smsBonus = usage?.smsBonus || 0;
              const voiceCallsBonus = usage?.voiceCallsBonus || 0;
              const whatsappTotal = user.planLimits.maxWhatsappMessages + whatsappBonus;
              const smsTotal = user.planLimits.maxSmsMessages + smsBonus;
              const voiceCallsTotal = user.planLimits.maxVoiceCalls + voiceCallsBonus;

              return (
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.name}</p>
                          {user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER) && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 bg-purple-500/10 text-purple-500 border-purple-500/20">
                              {tc("admin")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[user.status]} variant="secondary">
                      {tStatus(user.status.toLowerCase() as "active" | "suspended" | "pending_approval")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge className={planColors[user.plan]} variant="secondary">
                        {tPlans(user.plan.toLowerCase() as "free" | "basic" | "advanced" | "premium")}
                      </Badge>
                      {user.stripeSubscriptionId ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Icons.creditCard className="h-3.5 w-3.5 text-green-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("stripeActive")}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : user.plan !== "FREE" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Icons.user className="h-3.5 w-3.5 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("adminAssigned")}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={user._count.weddingEvents >= user.planLimits.maxEvents ? "text-destructive font-medium" : ""}>
                      {user._count.weddingEvents}
                    </span>
                    <span className="text-muted-foreground">/{user.planLimits.maxEvents}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {user.totalGuests}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2 min-w-[140px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1">
                                <Icons.messageSquare className="h-3 w-3 text-green-500" />
                                WA
                              </span>
                              <span>{whatsappSent}/{whatsappTotal}</span>
                            </div>
                            <Progress value={getUsagePercent(whatsappSent, user.planLimits.maxWhatsappMessages, whatsappBonus)} className="h-1.5" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("whatsappUsage")}: {whatsappSent}/{whatsappTotal}</p>
                          {whatsappBonus > 0 && <p className="text-xs text-muted-foreground">(+{whatsappBonus} {t("bonus")})</p>}
                        </TooltipContent>
                      </Tooltip>

                      {smsTotal > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1">
                                  <Icons.phone className="h-3 w-3 text-blue-500" />
                                  SMS
                                </span>
                                <span>{smsSent}/{smsTotal}</span>
                              </div>
                              <Progress value={getUsagePercent(smsSent, user.planLimits.maxSmsMessages, smsBonus)} className="h-1.5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("smsUsage")}: {smsSent}/{smsTotal}</p>
                            {smsBonus > 0 && <p className="text-xs text-muted-foreground">(+{smsBonus} {t("bonus")})</p>}
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {voiceCallsTotal > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1">
                                  <Icons.phone className="h-3 w-3 text-purple-500" />
                                  {t("voiceCalls")}
                                </span>
                                <span>{voiceCallsMade}/{voiceCallsTotal}</span>
                              </div>
                              <Progress value={getUsagePercent(voiceCallsMade, user.planLimits.maxVoiceCalls, voiceCallsBonus)} className="h-1.5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("voiceCallsUsage")}: {voiceCallsMade}/{voiceCallsTotal}</p>
                            {voiceCallsBonus > 0 && <p className="text-xs text-muted-foreground">(+{voiceCallsBonus} {t("bonus")})</p>}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
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
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{tc("actions")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {user.status === UserStatus.ACTIVE && (
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(user.id, "suspend")}
                            className="text-destructive"
                          >
                            <Icons.close className="me-2 h-4 w-4" />
                            {t("suspendUser")}
                          </DropdownMenuItem>
                        )}

                        {(user.status === UserStatus.SUSPENDED || user.status === UserStatus.PENDING_APPROVAL) && (
                          <DropdownMenuItem onClick={() => handleStatusChange(user.id, "reactivate")}>
                            <Icons.check className="me-2 h-4 w-4" />
                            {tc("reactivate")}
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Icons.creditCard className="me-2 h-4 w-4" />
                            {t("changePlan")}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {Object.values(PlanTier).map((plan) => (
                                <DropdownMenuItem
                                  key={plan}
                                  onClick={() => handlePlanChange(user.id, plan, false, user.stripeSubscriptionId ? true : false)}
                                  disabled={user.plan === plan}
                                >
                                  <Badge className={planColors[plan]} variant="secondary">
                                    {tPlans(plan.toLowerCase() as "free" | "basic" | "advanced" | "premium")}
                                  </Badge>
                                  {user.stripeSubscriptionId && plan !== "FREE" && plan !== "BUSINESS" && (
                                    <Icons.creditCard className="ms-auto h-3.5 w-3.5 text-green-500" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                              {user.stripeSubscriptionId && (
                                <>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                    <Icons.creditCard className="inline h-3 w-3 me-1 text-green-500" />
                                    {t("syncWithStripe")}
                                  </div>
                                </>
                              )}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem onClick={() => handleToggleAdminRole(user.id)}>
                          <Icons.shield className="me-2 h-4 w-4" />
                          {user.roles?.includes(UserRole.ROLE_PLATFORM_OWNER)
                            ? t("revokeAdminRole")
                            : t("grantAdminRole")}
                        </DropdownMenuItem>

                        {vapiPhoneNumbers.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Icons.phone className="me-2 h-4 w-4" />
                                {t("assignVapiPhone")}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    onClick={() => handleAssignVapiPhoneNumber(user.id, null)}
                                    disabled={!userVapiPhoneNumbers[user.id]}
                                  >
                                    <span className="text-muted-foreground">{t("useDefault")}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {vapiPhoneNumbers.map((phone) => (
                                    <DropdownMenuItem
                                      key={phone.id}
                                      onClick={() => handleAssignVapiPhoneNumber(user.id, phone.id)}
                                      disabled={userVapiPhoneNumbers[user.id] === phone.id}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{phone.phoneNumber}</span>
                                        {phone.displayName && (
                                          <span className="text-xs text-muted-foreground">({phone.displayName})</span>
                                        )}
                                        {phone.isDefault && (
                                          <Badge variant="outline" className="text-xs py-0 px-1">Default</Badge>
                                        )}
                                        {userVapiPhoneNumbers[user.id] === phone.id && (
                                          <Icons.check className="h-4 w-4 text-green-500" />
                                        )}
                                      </div>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          </>
                        )}

                        {whatsappPhoneNumbers.length > 0 && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Icons.messageSquare className="me-2 h-4 w-4" />
                                {t("assignWhatsappPhone")}
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem
                                    onClick={() => handleAssignWhatsappPhoneNumber(user.id, null)}
                                    disabled={!userWhatsappPhoneNumbers[user.id]}
                                  >
                                    <span className="text-muted-foreground">{t("useDefault")}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {whatsappPhoneNumbers.map((phone) => (
                                    <DropdownMenuItem
                                      key={phone.id}
                                      onClick={() => handleAssignWhatsappPhoneNumber(user.id, phone.id)}
                                      disabled={userWhatsappPhoneNumbers[user.id] === phone.id}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>{phone.phoneNumber}</span>
                                        {phone.displayName && (
                                          <span className="text-xs text-muted-foreground">({phone.displayName})</span>
                                        )}
                                        {phone.isDefault && (
                                          <Badge variant="outline" className="text-xs py-0 px-1">Default</Badge>
                                        )}
                                        {userWhatsappPhoneNumbers[user.id] === phone.id && (
                                          <Icons.check className="h-4 w-4 text-green-500" />
                                        )}
                                      </div>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          </>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>{t("usageActions")}</DropdownMenuLabel>

                        <DropdownMenuItem
                          onClick={() => openCreditsDialog(user.id, user.name || "", whatsappBonus, smsBonus, voiceCallsBonus)}
                        >
                          <Icons.creditCard className="me-2 h-4 w-4" />
                          {t("manageCredits")}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleResetUsage(user.id)}>
                          <Icons.refresh className="me-2 h-4 w-4" />
                          {t("resetUsage")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Unified Credits Management Dialog */}
      <Dialog open={creditsDialog.open} onOpenChange={(open) => !open && closeCreditsDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("manageCredits")}</DialogTitle>
            <DialogDescription>
              {t("manageCreditsDesc", { name: creditsDialog.userName })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Current Bonus Display */}
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-2">{t("currentBonus")}:</p>
              <div className="flex flex-wrap gap-4">
                <span>WhatsApp: {creditsDialog.currentWhatsappBonus}</span>
                <span>SMS: {creditsDialog.currentSmsBonus}</span>
                <span>{t("voiceCalls")}: {creditsDialog.currentVoiceCallsBonus}</span>
              </div>
            </div>

            {/* Remove Mode Toggle */}
            <div className="flex items-center space-x-2 rounded-md border p-3">
              <Checkbox
                id="remove-mode"
                checked={isRemoveMode}
                onCheckedChange={(checked) => setIsRemoveMode(checked === true)}
              />
              <Label htmlFor="remove-mode" className="text-sm font-medium cursor-pointer">
                {t("removeCreditsMode")}
              </Label>
            </div>

            {/* WhatsApp Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="whatsapp-credits" className="text-end">
                WhatsApp
              </Label>
              <Input
                id="whatsapp-credits"
                type="number"
                min="0"
                value={creditsWhatsapp}
                onChange={(e) => setCreditsWhatsapp(e.target.value)}
                className="col-span-3"
                placeholder="0"
              />
            </div>

            {/* SMS Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sms-credits" className="text-end">
                SMS
              </Label>
              <Input
                id="sms-credits"
                type="number"
                min="0"
                value={creditsSms}
                onChange={(e) => setCreditsSms(e.target.value)}
                className="col-span-3"
                placeholder="0"
              />
            </div>

            {/* Voice Calls Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="voice-calls-credits" className="text-end">
                {t("voiceCalls")}
              </Label>
              <Input
                id="voice-calls-credits"
                type="number"
                min="0"
                value={creditsVoiceCalls}
                onChange={(e) => setCreditsVoiceCalls(e.target.value)}
                className="col-span-3"
                placeholder="0"
              />
            </div>

            {/* Preview of new values */}
            {(parseInt(creditsWhatsapp) || parseInt(creditsSms) || parseInt(creditsVoiceCalls)) ? (
              <div className={`rounded-md p-3 text-sm border ${isRemoveMode ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                <p className="font-medium mb-1">{t("newBonus")}:</p>
                <div className="flex flex-wrap gap-4">
                  <span>WhatsApp: {getNewBonusValues().whatsapp}</span>
                  <span>SMS: {getNewBonusValues().sms}</span>
                  <span>{t("voiceCalls")}: {getNewBonusValues().voiceCalls}</span>
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreditsDialog}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleManageCredits}
              disabled={loading === creditsDialog.userId}
              variant={isRemoveMode ? "destructive" : "default"}
            >
              {loading === creditsDialog.userId && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {isRemoveMode ? t("removeCredits") : t("addCredits")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
