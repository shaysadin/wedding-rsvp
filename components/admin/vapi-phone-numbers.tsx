"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Phone,
  Plus,
  Star,
  Trash2,
  Users,
  Pencil,
  Check,
  X,
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
  createVapiPhoneNumber,
  updateVapiPhoneNumber,
  deleteVapiPhoneNumber,
  setDefaultVapiPhoneNumber,
} from "@/actions/vapi/phone-numbers";

interface VapiPhoneNumber {
  id: string;
  phoneNumber: string;
  vapiPhoneId: string;
  displayName: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  _count: { users: number };
}

interface VapiPhoneNumbersProps {
  phoneNumbers: VapiPhoneNumber[];
}

export function VapiPhoneNumbers({ phoneNumbers: initialPhoneNumbers }: VapiPhoneNumbersProps) {
  const [phoneNumbers, setPhoneNumbers] = useState(initialPhoneNumbers);
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    phoneNumber: "",
    vapiPhoneId: "",
    displayName: "",
    isDefault: false,
  });

  const resetForm = () => {
    setFormData({
      phoneNumber: "",
      vapiPhoneId: "",
      displayName: "",
      isDefault: false,
    });
    setEditingId(null);
  };

  const handleOpenDialog = (phoneNumber?: VapiPhoneNumber) => {
    if (phoneNumber) {
      setFormData({
        phoneNumber: phoneNumber.phoneNumber,
        vapiPhoneId: phoneNumber.vapiPhoneId,
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
    if (!formData.phoneNumber || !formData.vapiPhoneId) {
      toast.error("Phone number and VAPI Phone ID are required");
      return;
    }

    startTransition(async () => {
      const result = editingId
        ? await updateVapiPhoneNumber(editingId, formData)
        : await createVapiPhoneNumber(formData);

      if (result.success) {
        toast.success(editingId ? "Phone number updated" : "Phone number added");
        setIsDialogOpen(false);
        resetForm();
        // Refresh page to get updated data
        window.location.reload();
      } else {
        toast.error(result.error || "Failed to save phone number");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteVapiPhoneNumber(id);

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
      const result = await setDefaultVapiPhoneNumber(id);

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

  const handleToggleActive = (id: string, isActive: boolean) => {
    startTransition(async () => {
      const result = await updateVapiPhoneNumber(id, { isActive });

      if (result.success) {
        toast.success(isActive ? "Phone number activated" : "Phone number deactivated");
        setPhoneNumbers(
          phoneNumbers.map((p) =>
            p.id === id ? { ...p, isActive } : p
          )
        );
      } else {
        toast.error(result.error || "Failed to update status");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Phone className="size-5" />
              VAPI Phone Numbers
            </CardTitle>
            <CardDescription>
              Manage phone numbers for voice calls. Assign numbers to users or set a default for all.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 size-4" />
                Add Phone Number
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Phone Number" : "Add Phone Number"}
                </DialogTitle>
                <DialogDescription>
                  Add a Twilio phone number imported into VAPI for making voice calls.
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
                  />
                  <p className="text-xs text-muted-foreground">
                    The actual phone number in international format
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vapiPhoneId">VAPI Phone ID</Label>
                  <Input
                    id="vapiPhoneId"
                    placeholder="Enter VAPI phone number ID"
                    value={formData.vapiPhoneId}
                    onChange={(e) =>
                      setFormData({ ...formData, vapiPhoneId: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in VAPI Dashboard → Phone Numbers
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
                      <Loader2 className="mr-2 size-4 animate-spin" />
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
            <Phone className="mb-4 size-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No phone numbers configured yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Add a phone number to enable voice calls.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>VAPI ID</TableHead>
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
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">
                      {phone.vapiPhoneId.slice(0, 12)}...
                    </code>
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
                      onCheckedChange={(checked) =>
                        handleToggleActive(phone.id, checked)
                      }
                      disabled={isPending}
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
                            <AlertDialogTitle>Delete Phone Number</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {phone.phoneNumber}? This action cannot be undone.
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
