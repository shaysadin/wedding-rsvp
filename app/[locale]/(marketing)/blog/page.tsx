import { Metadata } from "next";
import { allPosts } from "contentlayer/generated";
import { getTranslations } from "next-intl/server";

import { getBlurDataURL } from "@/lib/utils";
import { BlogPosts } from "@/components/content/blog-posts";
import { HeaderSection } from "@/components/shared/header-section";

export const metadata: Metadata = {
  title: "Blog - Go Approval",
  description: "Tips, guides and insights for managing your wedding RSVPs and guest lists.",
};

export default async function BlogPage() {
  const t = await getTranslations("blog");

  const posts = allPosts
    .filter((post) => post.published)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const postsWithBlur = await Promise.all(
    posts.map(async (post) => ({
      ...post,
      blurDataURL: await getBlurDataURL(post.image),
    }))
  );

  return (
    <div className="container py-6 lg:py-10">
      <HeaderSection
        label={t("label")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="mt-10">
        {postsWithBlur.length > 0 ? (
          <BlogPosts posts={postsWithBlur} />
        ) : (
          <p className="text-center text-muted-foreground">
            {t("noPosts")}
          </p>
        )}
      </div>
    </div>
  );
}
