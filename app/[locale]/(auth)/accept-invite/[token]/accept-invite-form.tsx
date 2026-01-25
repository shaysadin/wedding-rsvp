"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Mail, Lock, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { acceptInvitation, acceptInvitationWithRegistration } from "@/actions/invitations";

interface AcceptInviteFormProps {
  token: string;
  invitation: {
    id: string;
    email: string | null;
    role: string;
    eventTitle: string;
    eventId: string;
    inviterName: string | null;
  };
  isLoggedIn: boolean;
  userEmail: string | null;
  locale: string;
}

export function AcceptInviteForm({
  token,
  invitation,
  isLoggedIn,
  userEmail,
  locale,
}: AcceptInviteFormProps) {
  const t = useTranslations("collaboration.acceptInvite");
  const router = useRouter();
  const isRTL = locale === "he";

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: invitation.email || "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const result = await acceptInvitation(token);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההזמנה התקבלה בהצלחה!" : "Invitation accepted successfully!");
        router.push(`/${locale}/events/${result.eventId}`);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בקבלת ההזמנה" : "Failed to accept invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = isRTL ? "שם הוא שדה חובה" : "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = isRTL ? "אימייל הוא שדה חובה" : "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = isRTL ? "אימייל לא תקין" : "Invalid email address";
    }

    if (!formData.password) {
      newErrors.password = isRTL ? "סיסמה היא שדה חובה" : "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = isRTL ? "הסיסמה חייבת להכיל לפחות 8 תווים" : "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = isRTL ? "הסיסמאות לא תואמות" : "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const result = await acceptInvitationWithRegistration(token, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "החשבון נוצר וההזמנה התקבלה!" : "Account created and invitation accepted!");
        // Redirect to login page to sign in with the new account
        router.push(`/${locale}/login?email=${encodeURIComponent(formData.email)}&registered=true`);
      }
    } catch {
      toast.error(isRTL ? "שגיאה ביצירת החשבון" : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  // If user is logged in, show simple accept button
  if (isLoggedIn) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            {isRTL ? "מוכן לקבל את ההזמנה" : "Ready to Accept"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {isRTL ? "מתחבר/ת כ" : "Signed in as"}
            </p>
            <p className="font-medium">{userEmail}</p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isRTL ? "תפקיד:" : "Role:"}
            </span>
            <Badge variant="secondary">
              {invitation.role === "EDITOR"
                ? isRTL ? "עורך" : "Editor"
                : isRTL ? "צופה" : "Viewer"}
            </Badge>
          </div>

          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="me-2 h-4 w-4" />
            )}
            {t("accept")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If user is not logged in, show registration form
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>
          {isRTL ? "צור חשבון וקבל את ההזמנה" : "Create Account & Accept"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegisterAndAccept} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              <User className="inline h-4 w-4 me-1" />
              {isRTL ? "שם מלא" : "Full Name"}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={isRTL ? "השם שלך" : "Your name"}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="inline h-4 w-4 me-1" />
              {isRTL ? "אימייל" : "Email"}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              disabled={isLoading || !!invitation.email}
              dir="ltr"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              <Lock className="inline h-4 w-4 me-1" />
              {isRTL ? "סיסמה" : "Password"}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isRTL ? "לפחות 8 תווים" : "At least 8 characters"}
              disabled={isLoading}
              dir="ltr"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              <Lock className="inline h-4 w-4 me-1" />
              {isRTL ? "אימות סיסמה" : "Confirm Password"}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder={isRTL ? "הזן את הסיסמה שוב" : "Enter password again"}
              disabled={isLoading}
              dir="ltr"
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <span className="text-sm text-muted-foreground">
              {isRTL ? "תפקיד:" : "Role:"}
            </span>
            <Badge variant="secondary">
              {invitation.role === "EDITOR"
                ? isRTL ? "עורך" : "Editor"
                : isRTL ? "צופה" : "Viewer"}
            </Badge>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="me-2 h-4 w-4" />
            )}
            {t("createAccount")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
