import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { BillingPageContent } from "@/components/dashboard/billing-page-content";

export default async function BillingPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user || !user.id) {
    redirect(`/${locale}/login`);
  }

  const subscriptionPlan = await getUserSubscriptionPlan(user.id);

  return (
    <div className="w-full h-full overflow-auto p-6">
      <BillingPageContent userId={user.id} subscriptionPlan={subscriptionPlan} />
    </div>
  );
}
