import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  Container,
  DivideX,
  Heading,
  SubHeading,
  Badge,
  CTA,
} from "@/components/nodus";

export const metadata: Metadata = {
  title: "Blog - Wedinex",
  description: "Tips, guides and insights for managing your wedding RSVPs and guest lists.",
};

export default async function BlogPage() {
  const t = await getTranslations("blog");

  return (
    <main>
      <DivideX />
      <Container className="border-divide flex flex-col items-center border-x pt-10 md:pt-20 md:pb-10">
        <Badge text={t("label")} />
        <Heading>{t("title")}</Heading>
        <SubHeading className="mx-auto mt-2 max-w-sm px-4">
          {t("subtitle")}
        </SubHeading>
        <div className="border-divide mt-10 w-full border-y py-20">
          <p className="text-center text-muted-foreground">
            {t("noPosts")}
          </p>
        </div>
      </Container>
      <DivideX />
      <CTA />
      <DivideX />
    </main>
  );
}
