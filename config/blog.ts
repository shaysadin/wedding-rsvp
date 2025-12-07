export const BLOG_CATEGORIES: {
  title: string;
  slug: "news" | "education";
  description: string;
}[] = [
  {
    title: "News",
    slug: "news",
    description: "Updates and announcements from Go Approval.",
  },
  {
    title: "Education",
    slug: "education",
    description: "Tips and guides for managing your wedding RSVPs.",
  },
];

export const BLOG_AUTHORS = {
  goapproval: {
    name: "Go Approval Team",
    image: "/_static/avatars/default.png",
    twitter: "goapproval",
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
