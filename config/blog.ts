export const BLOG_CATEGORIES: {
  title: string;
  slug: "news" | "education";
  description: string;
}[] = [
  {
    title: "News",
    slug: "news",
    description: "Updates and announcements from OtakuVerse.",
  },
  {
    title: "Education",
    slug: "education",
    description: "Tips and guides for managing your wedding RSVPs.",
  },
];

export const BLOG_AUTHORS = {
  otakuverse: {
    name: "OtakuVerse Team",
    image: "/_static/avatars/default.png",
    twitter: "otakuverse",
  },
  mickasmt: {
    name: "mickasmt",
    image: "/_static/avatars/mickasmt.png",
    twitter: "miickasmt",
  },
  shadcn: {
    name: "shadcn",
    image: "/_static/avatars/shadcn.jpeg",
    twitter: "shadcn",
  },
};
