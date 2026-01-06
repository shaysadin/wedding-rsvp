"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

import { getAIPrompt, updateAIPrompt, resetAIPromptToDefault, getDefaultPrompt } from "@/actions/ai-settings";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminSettingsPage() {
  const locale = useLocale();
  const isRTL = locale === "he";

  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isDefault, setIsDefault] = useState(true);

  useEffect(() => {
    loadPrompt();
  }, []);

  const loadPrompt = async () => {
    setIsLoading(true);
    try {
      const result = await getAIPrompt();
      setPrompt(result.prompt || "");
      setOriginalPrompt(result.prompt || "");
      setIsDefault(result.isDefault || false);
    } catch {
      toast.error(isRTL ? "שגיאה בטעינת ההגדרות" : "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateAIPrompt(prompt);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isRTL ? "ההגדרות נשמרו בהצלחה" : "Settings saved successfully");
        setOriginalPrompt(prompt);
        setIsDefault(false);
      }
    } catch {
      toast.error(isRTL ? "שגיאה בשמירת ההגדרות" : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetAIPromptToDefault();
      if (result.error) {
        toast.error(result.error);
      } else {
        const defaultPrompt = await getDefaultPrompt();
        setPrompt(defaultPrompt);
        setOriginalPrompt(defaultPrompt);
        setIsDefault(true);
        toast.success(isRTL ? "ההגדרות אופסו לברירת מחדל" : "Settings reset to default");
      }
    } catch {
      toast.error(isRTL ? "שגיאה באיפוס ההגדרות" : "Failed to reset settings");
    } finally {
      setIsResetting(false);
      setShowResetDialog(false);
    }
  };

  const hasChanges = prompt !== originalPrompt;

  return (
    <>
      <DashboardHeader
        heading={isRTL ? "הגדרות מערכת" : "System Settings"}
        text={isRTL ? "הגדרות גלובליות למערכת" : "Global system settings"}
      />

      <div className="space-y-6">
        {/* AI Prompt Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Icons.sparkles className="h-5 w-5" />
                  {isRTL ? "הגדרות AI להזמנות" : "AI Invitation Settings"}
                </CardTitle>
                <CardDescription>
                  {isRTL
                    ? "ערוך את הפרומפט המשמש ליצירת הזמנות עם בינה מלאכותית"
                    : "Edit the prompt used for AI invitation generation"}
                </CardDescription>
              </div>
              {isDefault ? (
                <Badge variant="secondary">
                  {isRTL ? "ברירת מחדל" : "Default"}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  {isRTL ? "מותאם אישית" : "Custom"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="prompt">
                    {isRTL ? "פרומפט ליצירת הזמנות" : "Invitation Generation Prompt"}
                  </Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={isRTL ? "הכנס את הפרומפט כאן..." : "Enter the prompt here..."}
                    className="min-h-[300px] font-mono text-sm"
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? "השתמש ב-{{FIELD_REPLACEMENTS}} כמציין מיקום להחלפות השדות"
                      : "Use {{FIELD_REPLACEMENTS}} as a placeholder for field replacements"}
                  </p>
                </div>

                {/* Preview of placeholder */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-2 text-sm font-medium">
                    {isRTL ? "תצוגה מקדימה של החלפות:" : "Field replacements preview:"}
                  </p>
                  <code className="text-xs text-muted-foreground">
                    {`"שם החתן והכלה" → "דוד ורותי"\n"תאריך האירוע" → "15 בינואר 2025"`}
                  </code>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                  >
                    {isSaving ? (
                      <Icons.spinner className="me-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.save className="me-2 h-4 w-4" />
                    )}
                    {isRTL ? "שמור שינויים" : "Save Changes"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowResetDialog(true)}
                    disabled={isDefault || isResetting}
                  >
                    <Icons.rotateCcw className="me-2 h-4 w-4" />
                    {isRTL ? "איפוס לברירת מחדל" : "Reset to Default"}
                  </Button>

                  {hasChanges && (
                    <Button
                      variant="ghost"
                      onClick={() => setPrompt(originalPrompt)}
                    >
                      {isRTL ? "בטל שינויים" : "Discard Changes"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icons.help className="h-4 w-4" />
              {isRTL ? "טיפים לכתיבת פרומפט" : "Prompt Writing Tips"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground" dir={isRTL ? "rtl" : "ltr"}>
              <li className="flex items-start gap-2">
                <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                {isRTL
                  ? "היה ספציפי לגבי מה צריך להשתנות ומה צריך להישאר זהה"
                  : "Be specific about what should change and what should stay the same"}
              </li>
              <li className="flex items-start gap-2">
                <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                {isRTL
                  ? "הדגש את חשיבות שמירת סגנון הגופן והצבעים המקוריים"
                  : "Emphasize the importance of preserving original font style and colors"}
              </li>
              <li className="flex items-start gap-2">
                <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                {isRTL
                  ? "ציין במפורש שטקסט בעברית צריך להיות RTL"
                  : "Explicitly mention that Hebrew text should be RTL"}
              </li>
              <li className="flex items-start gap-2">
                <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                {isRTL
                  ? "הוסף הוראות לשמירת קישוטים, עיטורים וגבולות"
                  : "Add instructions to preserve decorations, ornaments, and borders"}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? "איפוס לברירת מחדל" : "Reset to Default"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? "האם אתם בטוחים שברצונכם לאפס את הפרומפט לברירת המחדל? פעולה זו תמחק את ההתאמות שלכם."
                : "Are you sure you want to reset the prompt to default? This will remove your customizations."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? "ביטול" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset} disabled={isResetting}>
              {isResetting && <Icons.spinner className="me-2 h-4 w-4 animate-spin" />}
              {isRTL ? "אפס" : "Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
