"use client";

import { useTranslations } from "next-intl";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Icons } from "@/components/shared/icons";

type ViewMode = "grid" | "floor";

interface SeatingViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function SeatingViewToggle({ value, onChange }: SeatingViewToggleProps) {
  const t = useTranslations("seating");

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => val && onChange(val as ViewMode)}
      className="bg-muted p-1 rounded-lg"
    >
      <ToggleGroupItem
        value="grid"
        aria-label={t("gridView")}
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
      >
        <Icons.layoutGrid className="h-4 w-4 mr-2" />
        {t("gridView")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="floor"
        aria-label={t("floorPlan")}
        className="data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
      >
        <Icons.map className="h-4 w-4 mr-2" />
        {t("floorPlan")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
