// Blog functionality disabled - placeholder component

export interface BlogPost {
  title: string;
  description?: string;
  image?: string;
  date?: string;
  slug: string;
  authors: string[];
  blurDataURL?: string;
}

export function BlogCard({
  data,
  priority,
  horizontale = false,
}: {
  data: BlogPost;
  priority?: boolean;
  horizontale?: boolean;
}) {
  return null;
}
