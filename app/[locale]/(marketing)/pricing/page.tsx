import { Metadata } from "next";
import {
  DivideX,
  Pricing,
  PricingTable,
  FAQs,
  CTA,
} from "@/components/nodus";

export const metadata: Metadata = {
  title: "Pricing - Wedinex",
  description: "Simple, transparent pricing for wedding RSVP management. Start free and upgrade as you grow.",
};

export default function PricingPage() {
  return (
    <main>
      <DivideX />
      <Pricing />
      <DivideX />
      <PricingTable />
      <FAQs />
      <DivideX />
      <CTA />
      <DivideX />
    </main>
  );
}
