import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DashboardHeader } from "@/components/dashboard/header";
import { UserSettingsForm } from "@/components/dashboard/user-settings-form";
import { PageFadeIn } from "@/components/shared/page-fade-in";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("settings");

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Fetch full user data
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      locale: true,
      role: true,
      plan: true,
      status: true,
      createdAt: true,
    },
  });

  if (!userData) {
    redirect(`/${locale}/login`);
  }

  return (
    <PageFadeIn>
      <DashboardHeader
        heading={t("title")}
        text={t("description")}
      />
      <div className="grid gap-8">
        <UserSettingsForm user={userData} />
      </div>
    </PageFadeIn>
  );
}
