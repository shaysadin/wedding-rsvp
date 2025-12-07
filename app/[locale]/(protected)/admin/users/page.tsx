import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { getAllUsers } from "@/actions/admin";
import { DashboardHeader } from "@/components/dashboard/header";
import { AdminUsersTable } from "@/components/admin/users-table";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("admin");

  // Role check is handled by the admin layout
  if (!user) {
    redirect(`/${locale}/dashboard`);
  }

  const result = await getAllUsers();
  const users = result.success ? result.users : [];

  return (
    <>
      <DashboardHeader heading={t("users")} text={t("allUsers")} />
      <AdminUsersTable users={users || []} />
    </>
  );
}
