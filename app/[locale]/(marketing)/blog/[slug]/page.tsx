import { notFound } from "next/navigation";

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function PostPage({ params }: PostPageProps) {
  // Blog posts are coming soon - redirect to 404 for now
  notFound();
}
