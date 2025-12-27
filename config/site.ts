import { SidebarNavItem, SiteConfig } from "types";
import { env } from "@/env.mjs";

const site_url = env.NEXT_PUBLIC_APP_URL;

export const siteConfig: SiteConfig = {
  name: "Wedinex",
  description:
    "The smartest way to manage wedding RSVPs. Send invitations via WhatsApp & SMS, track responses in real-time, and create beautiful RSVP pages.",
  url: site_url,
  ogImage: `${site_url}/_static/og.jpg`,
  links: {
    twitter: "https://twitter.com/wedinex",
    github: "",
  },
  mailSupport: "support@wedinex.com",
};

export const footerLinks: SidebarNavItem[] = [
  {
    title: "Company",
    items: [
      { title: "About", href: "/about" },
      { title: "Terms", href: "/terms" },
      { title: "Privacy", href: "/privacy" },
    ],
  },
  {
    title: "Product",
    items: [
      { title: "Features", href: "/#features" },
      { title: "Pricing", href: "/pricing" },
      { title: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Support",
    items: [
      { title: "Help Center", href: "/help" },
      { title: "Contact", href: "/contact" },
      { title: "FAQ", href: "/pricing#faq" },
    ],
  },
];
