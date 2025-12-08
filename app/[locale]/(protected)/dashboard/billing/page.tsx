import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { getCurrentUser } from "@/lib/session";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { BillingPageContentSkeleton } from "@/components/skeletons";
import { PageFadeIn } from "@/components/shared/page-fade-in";

// Lazy load the heavy BillingPageContent component (~730 lines, ~85KB)
const BillingPageContent = dynamic(
  () => import("@/components/dashboard/billing-page-content").then((mod) => mod.BillingPageContent),
  {
    loading: () => <BillingPageContentSkeleton />,
  }
);

export default async function BillingPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();

  if (!user || !user.id) {
    redirect(`/${locale}/login`);
  }

  const subscriptionPlan = await getUserSubscriptionPlan(user.id);

  return (
    <PageFadeIn className="w-full h-full overflow-auto p-6">
      <BillingPageContent userId={user.id} subscriptionPlan={subscriptionPlan} />
    </PageFadeIn>
  );
}
