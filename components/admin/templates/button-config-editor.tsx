"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

interface ButtonConfig {
  id: string;
  titleHe: string;
  titleEn?: string;
}

interface ButtonConfigEditorProps {
  buttons: ButtonConfig[];
  onChange: (buttons: ButtonConfig[]) => void;
  hebrewOnly?: boolean;
}

export function ButtonConfigEditor({ buttons, onChange, hebrewOnly = false }: ButtonConfigEditorProps) {
  const onButtonsChange = onChange;
  const addButton = () => {
    if (buttons.length >= 3) {
      return; // Max 3 buttons for quick-reply
    }

    onButtonsChange([
      ...buttons,
      {
        id: `btn_${Date.now()}`,
        titleHe: "",
        titleEn: "",
      },
    ]);
  };

  const removeButton = (index: number) => {
    const newButtons = buttons.filter((_, i) => i !== index);
    onButtonsChange(newButtons);
  };

  const updateButton = (index: number, field: keyof ButtonConfig, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = {
      ...newButtons[index],
      [field]: value,
    };
    onButtonsChange(newButtons);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Interactive Buttons (1-3)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addButton}
          disabled={buttons.length >= 3}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Button
        </Button>
      </div>

      <div className="space-y-3">
        {buttons.map((button, index) => (
          <Card key={button.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Button {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => removeButton(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className={hebrewOnly ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"}>
                <div className="space-y-2">
                  <Label className="text-xs">{hebrewOnly ? "מזהה כפתור" : "Button ID"}</Label>
                  <Input
                    value={button.id}
                    onChange={(e) => updateButton(index, "id", e.target.value)}
                    placeholder="yes"
                    className="text-xs font-mono"
                    dir={hebrewOnly ? "rtl" : "ltr"}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">
                    {hebrewOnly ? "טקסט הכפתור" : "Hebrew Text"}
                    <span className="text-muted-foreground ml-1">
                      ({button.titleHe.length}/20)
                    </span>
                  </Label>
                  <Input
                    value={button.titleHe}
                    onChange={(e) => updateButton(index, "titleHe", e.target.value)}
                    placeholder="כן, מגיע"
                    dir="rtl"
                    maxLength={20}
                  />
                </div>

                {!hebrewOnly && (
                  <div className="space-y-2">
                    <Label className="text-xs">
                      English Text
                      <span className="text-muted-foreground ml-1">
                        ({button.titleEn?.length || 0}/20)
                      </span>
                    </Label>
                    <Input
                      value={button.titleEn || ""}
                      onChange={(e) => updateButton(index, "titleEn", e.target.value)}
                      placeholder="Yes, Coming"
                      maxLength={20}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {buttons.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No buttons configured. Click "Add Button" to create interactive buttons.
        </div>
      )}
    </div>
  );
}
