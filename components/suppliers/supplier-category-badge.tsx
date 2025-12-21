"use client";

import { SupplierCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  UtensilsCrossed,
  Camera,
  Video,
  Music,
  Flower2,
  Palette,
  Cake,
  Shirt,
  Sparkles,
  Mail,
  Car,
  Hotel,
  Heart,
  MoreHorizontal,
} from "lucide-react";

const categoryConfig: Record<
  SupplierCategory,
  { label: string; labelHe: string; color: string; icon: React.ReactNode }
> = {
  VENUE: {
    label: "Venue",
    labelHe: "אולם",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
    icon: <Building2 className="h-3 w-3" />,
  },
  CATERING: {
    label: "Catering",
    labelHe: "קייטרינג",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
    icon: <UtensilsCrossed className="h-3 w-3" />,
  },
  PHOTOGRAPHY: {
    label: "Photography",
    labelHe: "צילום",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400",
    icon: <Camera className="h-3 w-3" />,
  },
  VIDEOGRAPHY: {
    label: "Videography",
    labelHe: "וידאו",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
    icon: <Video className="h-3 w-3" />,
  },
  DJ_MUSIC: {
    label: "DJ / Music",
    labelHe: "די.ג'יי / מוזיקה",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400",
    icon: <Music className="h-3 w-3" />,
  },
  FLOWERS: {
    label: "Flowers",
    labelHe: "פרחים",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
    icon: <Flower2 className="h-3 w-3" />,
  },
  DECORATIONS: {
    label: "Decorations",
    labelHe: "עיצוב",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
    icon: <Palette className="h-3 w-3" />,
  },
  CAKE: {
    label: "Cake",
    labelHe: "עוגה",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
    icon: <Cake className="h-3 w-3" />,
  },
  DRESS_ATTIRE: {
    label: "Dress / Attire",
    labelHe: "שמלה / חליפה",
    color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400",
    icon: <Shirt className="h-3 w-3" />,
  },
  MAKEUP_HAIR: {
    label: "Makeup / Hair",
    labelHe: "איפור / שיער",
    color: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    icon: <Sparkles className="h-3 w-3" />,
  },
  INVITATIONS: {
    label: "Invitations",
    labelHe: "הזמנות",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400",
    icon: <Mail className="h-3 w-3" />,
  },
  TRANSPORTATION: {
    label: "Transportation",
    labelHe: "הסעות",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    icon: <Car className="h-3 w-3" />,
  },
  ACCOMMODATION: {
    label: "Accommodation",
    labelHe: "לינה",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
    icon: <Hotel className="h-3 w-3" />,
  },
  RABBI_OFFICIANT: {
    label: "Rabbi / Officiant",
    labelHe: "רב / מסדר",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
    icon: <Heart className="h-3 w-3" />,
  },
  OTHER: {
    label: "Other",
    labelHe: "אחר",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400",
    icon: <MoreHorizontal className="h-3 w-3" />,
  },
};

interface SupplierCategoryBadgeProps {
  category: SupplierCategory;
  locale?: string;
  showIcon?: boolean;
}

export function SupplierCategoryBadge({
  category,
  locale = "he",
  showIcon = true,
}: SupplierCategoryBadgeProps) {
  const config = categoryConfig[category];

  return (
    <Badge variant="outline" className={`${config.color} border-0 gap-1`}>
      {showIcon && config.icon}
      {locale === "he" ? config.labelHe : config.label}
    </Badge>
  );
}

export function getCategoryLabel(category: SupplierCategory, locale: string = "he") {
  return locale === "he" ? categoryConfig[category].labelHe : categoryConfig[category].label;
}

export function getCategoryOptions(locale: string = "he") {
  return Object.entries(categoryConfig).map(([value, config]) => ({
    value: value as SupplierCategory,
    label: locale === "he" ? config.labelHe : config.label,
  }));
}

export { categoryConfig };
