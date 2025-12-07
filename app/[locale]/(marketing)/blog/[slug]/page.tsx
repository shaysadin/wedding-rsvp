import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allPosts } from "contentlayer/generated";

import { formatDate, getBlurDataURL, placeholderBlurhash } from "@/lib/utils";
import { Mdx } from "@/components/content/mdx-components";
import Author from "@/components/content/author";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getPostFromParams(params: PostPageProps["params"]) {
  const { slug } = await params;
  const post = allPosts.find((post) => post.slugAsParams === slug);

  if (!post) {
    null;
  }

  return post;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const post = await getPostFromParams(params);

  if (!post) {
    return {};
  }

  return {
    title: `${post.title} - Go Approval Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      images: [post.image],
    },
  };
}

export async function generateStaticParams() {
  return allPosts.map((post) => ({
    slug: post.slugAsParams,
  }));
}

export default async function PostPage({ params }: PostPageProps) {
  const post = await getPostFromParams(params);

  if (!post) {
    notFound();
  }

  const blurDataURL = await getBlurDataURL(post.image);

  return (
    <MaxWidthWrapper className="py-6 lg:py-10">
      <Link
        href="/blog"
        className={cn(buttonVariants({ variant: "ghost" }), "mb-8")}
      >
        <Icons.chevronLeft className="mr-2 size-4" />
        All posts
      </Link>

      <article className="container relative max-w-3xl">
        <div>
          {post.date && (
            <time
              dateTime={post.date}
              className="block text-sm text-muted-foreground"
            >
              Published on {formatDate(post.date)}
            </time>
          )}
          <h1 className="mt-2 inline-block font-heading text-4xl leading-tight lg:text-5xl">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center space-x-3">
            {post.authors?.map((author) => (
              <Author key={author} username={author} />
            ))}
          </div>
        </div>
        {post.image && (
          <Image
            src={post.image}
            alt={post.title}
            width={720}
            height={405}
            className="my-8 rounded-md border bg-muted transition-colors"
            placeholder="blur"
            blurDataURL={blurDataURL ?? placeholderBlurhash}
            priority
          />
        )}
        <Mdx code={post.body.code} />

        <hr className="mt-12" />

        <div className="flex justify-center py-6 lg:py-10">
          <Link href="/blog" className={cn(buttonVariants({ variant: "ghost" }))}>
            <Icons.chevronLeft className="mr-2 size-4" />
            See all posts
          </Link>
        </div>
      </article>
    </MaxWidthWrapper>
  );
}
