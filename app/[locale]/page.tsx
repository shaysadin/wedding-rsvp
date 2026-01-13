import {
  Navbar,
  Footer,
  DivideX,
  Hero,
  HeroImage,
  LogoCloud,
  HowItWorks,
  AgenticIntelligence,
  UseCases,
  Benefits,
  Testimonials,
  Pricing,
  Security,
  FAQs,
  CTA,
} from "@/components/nodus";

export default function IndexPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <DivideX />
        <Hero />
        <DivideX />
        <HeroImage />
        <DivideX />
        <LogoCloud />
        <DivideX />
        <HowItWorks />
        <DivideX />
        <AgenticIntelligence />
        <DivideX />
        <UseCases />
        <DivideX />
        <Benefits />
        <DivideX />
        <Testimonials />
        <DivideX />
        <Pricing />
        <DivideX />
        <Security />
        <DivideX />
        <FAQs />
        <DivideX />
        <CTA />
        <DivideX />
      </main>
      <Footer />
    </div>
  );
}
