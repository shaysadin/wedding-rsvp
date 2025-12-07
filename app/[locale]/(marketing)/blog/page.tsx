import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HeaderSection } from "@/components/shared/header-section";

export const metadata: Metadata = {
  title: "Blog - Go Approval",
  description: "Tips, guides and insights for managing your wedding RSVPs and guest lists.",
};

export default async function BlogPage() {
  const t = await getTranslations("blog");

  return (
    <div className="container py-6 lg:py-10">
      <HeaderSection
        label={t("label")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="mt-10">
        <p className="text-center text-muted-foreground">
          {t("noPosts")}
        </p>
      </div>
    </div>
  );
}
