"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  MessageCircle,
  Plus,
  Star,
  Trash2,
  Users,
  Pencil,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  addWhatsAppPhoneNumber,
  removeWhatsAppPhoneNumber,
  setActiveWhatsAppPhoneNumber,
  setDefaultWhatsAppPhoneNumber,
  updateWhatsAppPhoneNumberDisplayName,
} from "@/actions/whatsapp-phone-numbers";

interface WhatsAppPhoneNumber {
  id: string;
  phoneNumber: string;
  displayName: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  _count: { users: number };
}

interface WhatsAppPhoneNumbersAdminProps {
  phoneNumbers: WhatsAppPhoneNumber[];
}

export function WhatsAppPhoneNumbersAdmin({
  phoneNumbers: initialPhoneNumbers,
}: WhatsAppPhoneNumbersAdminProps) {
  const [phoneNumbers, setPhoneNumbers] = useState(initialPhoneNumbers);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    phoneNumber: "",
    displayName: "",
    isDefault: false,
  });

  const resetForm = () => {
    setFormData({
      phoneNumber: "",
      displayName: "",
      isDefault: false,
    });
    setEditingId(null);
  };

  const handleOpenDialog = (phoneNumber?: WhatsAppPhoneNumber) => {
    if (phoneNumber) {
      setFormData({
        phoneNumber: phoneNumber.phoneNumber,
        displayName: phoneNumber.displayName || "",
        isDefault: phoneNumber.isDefault,
      });
      setEditingId(phoneNumber.id);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.phoneNumber) {
      toast.error("Phone number is required");
      return;
    }

    startTransition(async () => {
      if (editingId) {
        // Update display name
        const result = await updateWhatsAppPhoneNumberDisplayName(
          editingId,
          formData.displayName || null
        );

        if (result.success) {
          // If setting as default, also call setDefault
          if (formData.isDefault) {
            await setDefaultWhatsAppPhoneNumber(editingId);
          }
          toast.success("Phone number updated");
          setIsDialogOpen(false);
          resetForm();
          window.location.reload();
        } else {
          toast.error(result.error || "Failed to update phone number");
        }
      } else {
        // Create new
        const result = await addWhatsAppPhoneNumber(
          formData.phoneNumber,
          formData.displayName || null
        );

        if (result.success && result.phoneNumber) {
          // If setting as default, also call setDefault
          if (formData.isDefault) {
            await setDefaultWhatsAppPhoneNumber(result.phoneNumber.id);
          }
          toast.success("Phone number added");
          setIsDialogOpen(false);
          resetForm();
          window.location.reload();
        } else {
          toast.error(result.error || "Failed to add phone number");
        }
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await removeWhatsAppPhoneNumber(id);

      if (result.success) {
        toast.success("Phone number deleted");
        setPhoneNumbers(phoneNumbers.filter((p) => p.id !== id));
      } else {
        toast.error(result.error || "Failed to delete phone number");
      }
    });
  };

  const handleSetDefault = (id: string) => {
    startTransition(async () => {
      const result = await setDefaultWhatsAppPhoneNumber(id);

      if (result.success) {
        toast.success("Default phone number updated");
        setPhoneNumbers(
          phoneNumbers.map((p) => ({
            ...p,
            isDefault: p.id === id,
          }))
        );
      } else {
        toast.error(result.error || "Failed to set default");
      }
    });
  };

  const handleToggleActive = (id: string, currentlyActive: boolean) => {
    if (!currentlyActive) {
      // Activating this number
      startTransition(async () => {
        const result = await setActiveWhatsAppPhoneNumber(id);

        if (result.success) {
          toast.success("Phone number activated");
          setPhoneNumbers(
            phoneNumbers.map((p) => ({
              ...p,
              isActive: p.id === id,
            }))
          );
        } else {
          toast.error(result.error || "Failed to activate");
        }
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="size-5" />
              WhatsApp Phone Numbers
            </CardTitle>
            <CardDescription>
              Manage phone numbers for WhatsApp messages. Set a default number
              for all users or assign specific numbers to users.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="me-2 size-4" />
                Add Phone Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Phone Number" : "Add Phone Number"}
                </DialogTitle>
                <DialogDescription>
                  Add a Twilio WhatsApp phone number for sending messages.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    placeholder="+972501234567"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneNumber: e.target.value })
                    }
                    disabled={!!editingId}
                  />
                  <p className="text-xs text-muted-foreground">
                    Phone number in international format (e.g., +972501234567)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name (Optional)</Label>
                  <Input
                    id="displayName"
                    placeholder="e.g., Main Line, Backup"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="isDefault">Set as Default</Label>
                    <p className="text-xs text-muted-foreground">
                      Used for users without an assigned number
                    </p>
                  </div>
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isDefault: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="me-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    "Update"
                  ) : (
                    "Add"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {phoneNumbers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="mb-4 size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No phone numbers configured yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Add a phone number to enable WhatsApp messaging.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {phoneNumbers.map((phone) => (
                <TableRow key={phone.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{phone.phoneNumber}</span>
                      {phone.displayName && (
                        <span className="text-sm text-muted-foreground">
                          ({phone.displayName})
                        </span>
                      )}
                      {phone.isDefault && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="size-3" />
                          Default
                        </Badge>
                      )}
                      {phone.isActive && (
                        <Badge variant="outline" className="gap-1">
                          <Check className="size-3" />
                          Active
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="size-4 text-muted-foreground" />
                      <span>{phone._count.users}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={phone.isActive}
                      onCheckedChange={() =>
                        handleToggleActive(phone.id, phone.isActive)
                      }
                      disabled={isPending || phone.isActive}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!phone.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(phone.id)}
                          disabled={isPending}
                          title="Set as default"
                        >
                          <Star className="size-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(phone)}
                        disabled={isPending}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending || phone._count.users > 0}
                            title={
                              phone._count.users > 0
                                ? "Cannot delete: assigned to users"
                                : "Delete"
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Phone Number
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {phone.phoneNumber}
                              ? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(phone.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
