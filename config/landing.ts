import { FeatureLdg, InfoLdg, TestimonialType } from "types";

export const infos: InfoLdg[] = [
  {
    title: "Streamline Your Wedding Planning",
    description:
      "OtakuVerse takes the stress out of managing wedding RSVPs. From sending invitations to tracking responses, everything is handled in one beautiful dashboard.",
    image: "/_static/illustrations/work-from-home.jpg",
    list: [
      {
        title: "WhatsApp & SMS",
        description: "Send invitations through channels your guests actually use.",
        icon: "messageCircle",
      },
      {
        title: "Real-time Tracking",
        description: "See who's coming, who's not, and who hasn't responded yet.",
        icon: "chart",
      },
      {
        title: "Beautiful RSVP Pages",
        description: "Customizable RSVP pages that match your wedding style.",
        icon: "palette",
      },
    ],
  },
  {
    title: "Everything You Need in One Place",
    description:
      "Import your guest list, customize your messages, and let OtakuVerse handle the rest. Track responses, send reminders, and export reports effortlessly.",
    image: "/_static/illustrations/work-from-home.jpg",
    list: [
      {
        title: "Easy Import",
        description: "Import guests from Excel or add them manually in seconds.",
        icon: "fileText",
      },
      {
        title: "Smart Reminders",
        description: "Automatic reminders to guests who haven't responded.",
        icon: "bell",
      },
      {
        title: "Detailed Reports",
        description: "Export guest lists and dietary requirements for your venue.",
        icon: "download",
      },
    ],
  },
];

export const features: FeatureLdg[] = [
  {
    title: "WhatsApp Invitations",
    description:
      "Send personalized wedding invitations directly to WhatsApp. Higher open rates than email.",
    link: "/pricing",
    icon: "messageCircle",
  },
  {
    title: "SMS Messaging",
    description:
      "Reach guests without WhatsApp via SMS. Perfect for older family members.",
    link: "/pricing",
    icon: "phone",
  },
  {
    title: "Custom RSVP Pages",
    description:
      "Beautiful, branded RSVP pages with your colors, fonts, and wedding details.",
    link: "/pricing",
    icon: "palette",
  },
  {
    title: "Guest Management",
    description:
      "Organize guests by family, side (bride/groom), and groups. Import from Excel.",
    link: "/pricing",
    icon: "users",
  },
  {
    title: "Real-time Dashboard",
    description:
      "Track RSVPs in real-time. See confirmed, declined, and pending responses at a glance.",
    link: "/pricing",
    icon: "chart",
  },
  {
    title: "Smart Analytics",
    description:
      "Know exactly how many guests are coming, dietary requirements, and more.",
    link: "/pricing",
    icon: "lineChart",
  },
];

export const testimonials: TestimonialType[] = [
  {
    name: "Sarah & David",
    job: "Married June 2024",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    review:
      "OtakuVerse saved us so much time! We had 300 guests and tracking RSVPs was a nightmare before. The WhatsApp integration is genius - everyone responded within days.",
  },
  {
    name: "Rachel Cohen",
    job: "Mother of the Bride",
    image: "https://randomuser.me/api/portraits/women/2.jpg",
    review:
      "As a mom helping plan my daughter's wedding, I was worried about the technology. But OtakuVerse is so easy to use. Even my husband figured it out!",
  },
  {
    name: "Michael & Noa",
    job: "Married August 2024",
    image: "https://randomuser.me/api/portraits/men/3.jpg",
    review:
      "The automatic reminders feature is amazing. We didn't have to chase anyone - the system did it for us. Highly recommend for busy couples.",
  },
  {
    name: "Yael Levi",
    job: "Wedding Planner",
    image: "https://randomuser.me/api/portraits/women/4.jpg",
    review:
      "I recommend OtakuVerse to all my clients now. It's professional, reliable, and makes my job so much easier. The reporting features are excellent.",
  },
  {
    name: "Daniel & Maya",
    job: "Married December 2024",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
    review:
      "We loved being able to customize our RSVP page to match our wedding theme. The preview feature helped us get it perfect before sending.",
  },
  {
    name: "Amit Shapira",
    job: "Event Venue Manager",
    image: "https://randomuser.me/api/portraits/men/6.jpg",
    review:
      "Couples who use OtakuVerse always have accurate guest counts. The export feature makes our catering planning seamless. Great product!",
  },
  {
    name: "Shira & Oren",
    job: "Married October 2024",
    image: "https://randomuser.me/api/portraits/women/7.jpg",
    review:
      "Managing RSVPs for our wedding of 400 guests was effortless with OtakuVerse. The SMS feature was perfect for reaching our grandparents.",
  },
];
