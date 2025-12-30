"use client";

import { useState } from "react";
import { Phone, Plus, Star, Trash2, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createVapiPhoneNumber,
  deleteVapiPhoneNumber,
  setDefaultVapiPhoneNumber,
  updateVapiPhoneNumber,
} from "@/actions/vapi/phone-numbers";

interface VapiPhoneNumber {
  id: string;
  phoneNumber: string;
  vapiPhoneId: string;
  displayName: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  _count: { users: number };
}

interface Props {
  initialPhoneNumbers: VapiPhoneNumber[];
}

export function VapiPhoneNumbersClient({ initialPhoneNumbers }: Props) {
  const [phoneNumbers, setPhoneNumbers] = useState(initialPhoneNumbers);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newVapiPhoneId, setNewVapiPhoneId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);

  const handleAdd = async () => {
    if (!newPhoneNumber || !newVapiPhoneId) {
      toast.error("Phone number and VAPI Phone ID are required");
      return;
    }

    setIsLoading(true);
    const result = await createVapiPhoneNumber({
      phoneNumber: newPhoneNumber,
      vapiPhoneId: newVapiPhoneId,
      displayName: newDisplayName || undefined,
      isDefault: newIsDefault,
    });
    setIsLoading(false);

    if (result.success) {
      toast.success("Phone number added");
      setIsAdding(false);
      setNewPhoneNumber("");
      setNewVapiPhoneId("");
      setNewDisplayName("");
      setNewIsDefault(false);
      window.location.reload();
    } else {
      toast.error(result.error || "Failed to add phone number");
    }
  };

  const handleSetDefault = async (id: string) => {
    setIsLoading(true);
    const result = await setDefaultVapiPhoneNumber(id);
    setIsLoading(false);

    if (result.success) {
      toast.success("Default phone number updated");
      setPhoneNumbers(phoneNumbers.map((p) => ({ ...p, isDefault: p.id === id })));
    } else {
      toast.error(result.error || "Failed to set default");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    setIsLoading(true);
    const result = await updateVapiPhoneNumber(id, { isActive });
    setIsLoading(false);

    if (result.success) {
      toast.success(isActive ? "Activated" : "Deactivated");
      setPhoneNumbers(phoneNumbers.map((p) => (p.id === id ? { ...p, isActive } : p)));
    } else {
      toast.error(result.error || "Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this phone number?")) return;

    setIsLoading(true);
    const result = await deleteVapiPhoneNumber(id);
    setIsLoading(false);

    if (result.success) {
      toast.success("Phone number deleted");
      setPhoneNumbers(phoneNumbers.filter((p) => p.id !== id));
    } else {
      toast.error(result.error || "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex justify-end">
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="mr-2 size-4" />
          Add Phone Number
        </Button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="rounded-lg border p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                placeholder="+972501234567"
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>VAPI Phone ID</Label>
              <Input
                placeholder="From VAPI Dashboard"
                value={newVapiPhoneId}
                onChange={(e) => setNewVapiPhoneId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name (Optional)</Label>
              <Input
                placeholder="e.g., Main Line"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={newIsDefault} onCheckedChange={setNewIsDefault} />
              <Label>Set as Default</Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Phone Numbers List */}
      {phoneNumbers.length === 0 ? (
        <div className="text-center py-8">
          <Phone className="mx-auto mb-4 size-12 text-muted-foreground" />
          <p className="text-muted-foreground">No phone numbers configured yet.</p>
          <p className="text-sm text-muted-foreground">
            Click &quot;Add Phone Number&quot; to get started.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone Number</TableHead>
              <TableHead>VAPI ID</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Active</TableHead>
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
                      <span className="text-muted-foreground">({phone.displayName})</span>
                    )}
                    {phone.isDefault && (
                      <Badge variant="secondary">
                        <Star className="mr-1 size-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    {phone.vapiPhoneId.slice(0, 12)}...
                  </code>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Users className="size-4 text-muted-foreground" />
                    {phone._count.users}
                  </div>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={phone.isActive}
                    onCheckedChange={(checked) => handleToggleActive(phone.id, checked)}
                    disabled={isLoading}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {!phone.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(phone.id)}
                        disabled={isLoading}
                        title="Set as default"
                      >
                        <Star className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(phone.id)}
                      disabled={isLoading || phone._count.users > 0}
                      title={phone._count.users > 0 ? "Cannot delete: has users" : "Delete"}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
