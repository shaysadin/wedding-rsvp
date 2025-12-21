"use client";

import { useLocale } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { SupplierCategory } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getCategoryLabel, categoryConfig } from "./supplier-category-badge";

interface CategoryData {
  category: SupplierCategory;
  count: number;
  totalAgreed: number;
  totalPaid: number;
}

interface BudgetCategoryChartProps {
  data: CategoryData[];
  currency?: string;
}

// Colors for each category
const CATEGORY_COLORS: Record<SupplierCategory, string> = {
  VENUE: "#8b5cf6",        // violet
  CATERING: "#f97316",     // orange
  PHOTOGRAPHY: "#06b6d4",  // cyan
  VIDEOGRAPHY: "#a855f7",  // purple
  DJ_MUSIC: "#ec4899",     // pink
  FLOWERS: "#f43f5e",      // rose
  DECORATIONS: "#f59e0b",  // amber
  CAKE: "#eab308",         // yellow
  DRESS_ATTIRE: "#d946ef", // fuchsia
  MAKEUP_HAIR: "#ef4444",  // red
  INVITATIONS: "#14b8a6",  // teal
  TRANSPORTATION: "#3b82f6", // blue
  ACCOMMODATION: "#6366f1",  // indigo
  RABBI_OFFICIANT: "#10b981", // emerald
  OTHER: "#6b7280",        // gray
};

export function BudgetCategoryChart({ data, currency = "ILS" }: BudgetCategoryChartProps) {
  const locale = useLocale();
  const isRTL = locale === "he";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Transform data for the pie chart
  const chartData = data
    .filter(item => item.totalAgreed > 0)
    .map(item => ({
      name: getCategoryLabel(item.category, locale),
      value: item.totalAgreed,
      paid: item.totalPaid,
      category: item.category,
      count: item.count,
    }))
    .sort((a, b) => b.value - a.value);

  const totalAgreed = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className={cn("text-sm font-medium", isRTL && "text-right")}>
            {isRTL ? "התפלגות לפי קטגוריה" : "Budget by Category"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-sm text-muted-foreground">
            {isRTL ? "אין נתונים להצגה" : "No data to display"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / totalAgreed) * 100).toFixed(1);
      const paidPercentage = data.value > 0
        ? ((data.paid / data.value) * 100).toFixed(0)
        : 0;

      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {isRTL ? "סכום" : "Amount"}: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {isRTL ? "מתוך הכל" : "Of total"}: {percentage}%
          </p>
          <p className="text-sm text-muted-foreground">
            {isRTL ? "שולם" : "Paid"}: {paidPercentage}%
          </p>
          <p className="text-sm text-muted-foreground">
            {isRTL ? "ספקים" : "Suppliers"}: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = () => {
    return (
      <div className={cn(
        "flex flex-wrap gap-2 mt-2 justify-center",
        isRTL && "flex-row-reverse"
      )}>
        {chartData.slice(0, 5).map((entry) => (
          <div
            key={entry.category}
            className={cn("flex items-center gap-1 text-xs", isRTL && "flex-row-reverse")}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[entry.category] }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
          </div>
        ))}
        {chartData.length > 5 && (
          <span className="text-xs text-muted-foreground">
            +{chartData.length - 5} {isRTL ? "עוד" : "more"}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-sm font-medium", isRTL && "text-right")}>
          {isRTL ? "התפלגות לפי קטגוריה" : "Budget by Category"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category]}
                    className="outline-none focus:outline-none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {renderLegend()}
      </CardContent>
    </Card>
  );
}
