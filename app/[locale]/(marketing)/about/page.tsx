import { Metadata } from "next";
import Image from "next/image";
import {
  Badge,
  Container,
  CTA,
  DivideX,
  Heading,
  SectionHeading,
  SubHeading,
  Testimonials,
  InformationBlock,
} from "@/components/nodus";

export const metadata: Metadata = {
  title: "About Us - Wedinex",
  description:
    "Learn more about Wedinex - the smart platform for managing wedding RSVPs, guest lists, and event communications.",
};

export default function AboutPage() {
  return (
    <main>
      <DivideX />
      <Container className="border-divide flex flex-col items-center justify-center border-x px-4 pt-10 pb-10 md:px-8 md:pt-32 md:pb-20">
        <div className="grid grid-cols-1 gap-20 md:grid-cols-2">
          <div className="flex flex-col items-start justify-start">
            <Badge text="About Us" />
            <Heading className="mt-4 text-left">
              Simplifying Wedding RSVP Management
            </Heading>
            <SubHeading className="mt-6 mr-auto text-left">
              Wedinex was born from a simple idea: managing wedding RSVPs
              shouldn&apos;t be stressful. We built a platform that makes it easy for
              couples and wedding planners to track guest responses, send
              beautiful invitations via WhatsApp and SMS, and manage seating
              arrangements - all in one place.
              <br /> <br />
              Today, Wedinex helps thousands of couples in Israel manage their
              special day with ease. From automated reminders to real-time RSVP
              tracking, we&apos;ve got you covered.
            </SubHeading>
          </div>
          <div className="border-divide rounded-3xl border p-2">
            <Image
              src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2670&auto=format&fit=crop"
              alt="Wedding celebration"
              width={1000}
              height={1000}
              className="h-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </Container>
      <Testimonials />
      <Container className="border-divide border-x border-t p-4 py-20 md:px-8 md:py-40">
        <div className="grid grid-cols-1 gap-10 md:gap-20 lg:grid-cols-2">
          <div className="flex flex-col items-start justify-start">
            <Badge text="Our Mission" />
            <SectionHeading className="mt-4 text-left">
              Making Your Wedding Day Perfect
            </SectionHeading>
            <SubHeading className="mt-6 mr-auto text-left">
              We believe every couple deserves a stress-free wedding planning
              experience. Our tools help you focus on what matters most.
            </SubHeading>
            <div className="divide-divide mt-8 grid grid-cols-3 gap-6">
              <MetricBlock value="95%" label="Response Rate" />
              <MetricBlock value="10K+" label="Happy Couples" />
              <MetricBlock value="1M+" label="RSVPs Managed" />
            </div>
          </div>
          <InformationBlock />
        </div>
      </Container>
      <DivideX />
      <Container className="border-divide flex flex-col items-center border-x py-16">
        <Badge text="Our Features" />
        <SectionHeading className="mt-4">
          Everything You Need
        </SectionHeading>
        <SubHeading className="mx-auto mt-6 max-w-lg px-4">
          From WhatsApp invitations to seating arrangements, we&apos;ve built
          every feature you need for a perfect wedding day.
        </SubHeading>
        <div className="mt-12 grid w-full grid-cols-1 gap-6 px-4 md:grid-cols-2 md:px-8 lg:grid-cols-3">
          <FeatureCard
            title="WhatsApp Integration"
            description="Send beautiful invitations and reminders directly via WhatsApp"
          />
          <FeatureCard
            title="Real-time Tracking"
            description="Monitor RSVP responses as they come in with live updates"
          />
          <FeatureCard
            title="Seating Planner"
            description="Drag-and-drop seating arrangements made simple"
          />
          <FeatureCard
            title="Voice AI Agent"
            description="Automated phone calls to confirm attendance"
          />
          <FeatureCard
            title="Multi-language"
            description="Full Hebrew and English support for your guests"
          />
          <FeatureCard
            title="Supplier Management"
            description="Track vendors, payments, and contracts in one place"
          />
        </div>
      </Container>
      <CTA />
      <DivideX />
    </main>
  );
}

const MetricBlock = ({ value, label }: { value: string; label: string }) => {
  return (
    <div className="flex flex-col items-start justify-start">
      <h3 className="text-charcoal-700 text-3xl font-medium dark:text-neutral-100">
        {value}
      </h3>
      <p className="text-sm text-gray-600 dark:text-neutral-400">{label}</p>
    </div>
  );
};

const FeatureCard = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className="border-divide rounded-xl border bg-gray-50 p-6 dark:bg-neutral-800">
      <h3 className="text-charcoal-700 text-lg font-medium dark:text-neutral-100">
        {title}
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-neutral-400">
        {description}
      </p>
    </div>
  );
};
