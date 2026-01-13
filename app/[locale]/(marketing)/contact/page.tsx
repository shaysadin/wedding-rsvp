import { Metadata } from "next";
import { Contact, DivideX } from "@/components/nodus";

export const metadata: Metadata = {
  title: "Contact Us - Wedinex",
  description:
    "Get in touch with the Wedinex team. We're here to help with your wedding RSVP management needs.",
};

export default function ContactPage() {
  return (
    <main>
      <DivideX />
      <Contact />
      <DivideX />
    </main>
  );
}
