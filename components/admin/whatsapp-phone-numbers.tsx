"use client";

import { useState, useEffect, useTransition } from "react";
import { WhatsAppPhoneNumber } from "@prisma/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";
import {
  getWhatsAppPhoneNumbers,
  addWhatsAppPhoneNumber,
  removeWhatsAppPhoneNumber,
  setActiveWhatsAppPhoneNumber,
} from "@/actions/whatsapp-phone-numbers";

interface WhatsAppPhoneNumbersProps {
  onActiveNumberChange?: (phoneNumber: string | null) => void;
}

export function WhatsAppPhoneNumbers({ onActiveNumberChange }: WhatsAppPhoneNumbersProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumbers, setPhoneNumbers] = useState<WhatsAppPhoneNumber[]>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load phone numbers on mount
  useEffect(() => {
    loadPhoneNumbers();
  }, []);

  const loadPhoneNumbers = async () => {
    setIsLoading(true);
    const result = await getWhatsAppPhoneNumbers();
    if (result.success && result.phoneNumbers) {
      setPhoneNumbers(result.phoneNumbers);
      const activeNumber = result.phoneNumbers.find((p) => p.isActive);
      if (onActiveNumberChange) {
        onActiveNumberChange(activeNumber?.phoneNumber || null);
      }
    } else if (result.error) {
      toast.error(result.error);
    }
    setIsLoading(false);
  };

  const handleAddPhoneNumber = () => {
    if (!newPhoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    setIsAdding(true);
    startTransition(async () => {
      const result = await addWhatsAppPhoneNumber(
        newPhoneNumber.trim(),
        newDisplayName.trim() || null
      );

      if (result.success) {
        toast.success("Phone number added successfully");
        setNewPhoneNumber("");
        setNewDisplayName("");
        await loadPhoneNumbers();
      } else {
        toast.error(result.error || "Failed to add phone number");
      }
      setIsAdding(false);
    });
  };

  const handleRemovePhoneNumber = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      const result = await removeWhatsAppPhoneNumber(id);

      if (result.success) {
        toast.success("Phone number removed successfully");
        await loadPhoneNumbers();
      } else {
        toast.error(result.error || "Failed to remove phone number");
      }
      setDeletingId(null);
    });
  };

  const handleSetActive = (id: string) => {
    startTransition(async () => {
      const result = await setActiveWhatsAppPhoneNumber(id);

      if (result.success) {
        toast.success("Active phone number updated");
        await loadPhoneNumbers();
      } else {
        toast.error(result.error || "Failed to set active phone number");
      }
    });
  };

  const activeNumber = phoneNumbers.find((p) => p.isActive);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
            <Icons.phone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-base">WhatsApp Phone Numbers</CardTitle>
            <CardDescription>
              Manage phone numbers for sending WhatsApp messages
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current active number display */}
        {activeNumber && (
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
            <div className="flex items-center gap-2">
              <Icons.check className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Active: {activeNumber.phoneNumber}
                {activeNumber.displayName && ` (${activeNumber.displayName})`}
              </span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Phone numbers list */}
            {phoneNumbers.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Select active number
                </Label>
                <RadioGroup
                  value={activeNumber?.id || ""}
                  onValueChange={handleSetActive}
                  className="space-y-2"
                  disabled={isPending}
                >
                  {phoneNumbers.map((phone) => (
                    <div
                      key={phone.id}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={phone.id} id={phone.id} />
                        <Label
                          htmlFor={phone.id}
                          className="flex cursor-pointer flex-col"
                        >
                          <span className="font-medium">{phone.phoneNumber}</span>
                          {phone.displayName && (
                            <span className="text-sm text-muted-foreground">
                              {phone.displayName}
                            </span>
                          )}
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePhoneNumber(phone.id)}
                        disabled={deletingId === phone.id || isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === phone.id ? (
                          <Icons.spinner className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icons.trash className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Icons.phone className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No phone numbers configured yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Add a phone number below to get started
                </p>
              </div>
            )}

            {/* Add new phone number form */}
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Add New Phone Number</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="new-phone" className="text-xs text-muted-foreground">
                    Phone Number
                  </Label>
                  <Input
                    id="new-phone"
                    placeholder="+972501234567"
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                    disabled={isAdding}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-display-name" className="text-xs text-muted-foreground">
                    Display Name (Optional)
                  </Label>
                  <Input
                    id="new-display-name"
                    placeholder="e.g., Main Business Line"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    disabled={isAdding}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddPhoneNumber}
                disabled={isAdding || !newPhoneNumber.trim()}
                size="sm"
              >
                {isAdding ? (
                  <>
                    <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Icons.add className="me-2 h-4 w-4" />
                    Add Phone Number
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Phone numbers must be in international format (e.g., +972501234567)
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
