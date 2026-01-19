import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { UsageTrackingContent } from "@/components/admin/usage-tracking-content";

export const metadata: Metadata = {
  title: "Usage Tracking | Admin",
  description: "System-wide usage and cost tracking",
};

export default async function UsageTrackingPage() {
  const t = await getTranslations("admin.usageTracking");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <UsageTrackingContent />
    </div>
  );
}
