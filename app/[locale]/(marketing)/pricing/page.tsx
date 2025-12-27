import { Metadata } from "next";

import { getCurrentUser } from "@/lib/session";
import { ComparePlans } from "@/components/pricing/compare-plans";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { PricingFaq } from "@/components/pricing/pricing-faq";

export const metadata: Metadata = {
  title: "Pricing - Wedinex",
  description: "Simple, transparent pricing for wedding RSVP management. Start free and upgrade as you grow.",
};

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex w-full flex-col gap-16 py-8 md:py-8">
      <PricingCards userId={user?.id} />
      <hr className="container" />
      <ComparePlans />
      <PricingFaq />
    </div>
  );
}
