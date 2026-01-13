import {
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
  LazySection,
} from "@/components/nodus";

export default function IndexPage() {
  return (
    <>
      <DivideX />
      <Hero />
      <DivideX />
      <HeroImage />
      <DivideX />
      <LogoCloud />
      <DivideX />
      <LazySection>
        <HowItWorks />
      </LazySection>
      <DivideX />
      <LazySection>
        <AgenticIntelligence />
      </LazySection>
      <DivideX />
      <LazySection>
        <UseCases />
      </LazySection>
      <DivideX />
      <LazySection>
        <Benefits />
      </LazySection>
      <DivideX />
      <LazySection>
        <Testimonials />
      </LazySection>
      <DivideX />
      <LazySection>
        <Pricing />
      </LazySection>
      <DivideX />
      <LazySection>
        <Security />
      </LazySection>
      <DivideX />
      <LazySection>
        <FAQs />
      </LazySection>
      <DivideX />
      <LazySection>
        <CTA />
      </LazySection>
      <DivideX />
    </>
  );
}
