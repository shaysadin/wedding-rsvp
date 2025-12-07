import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { Icons } from "../components/shared/icons";

type VerificationEmailProps = {
  verifyUrl: string;
  firstName: string;
  siteName: string;
  locale?: string;
};

export const VerificationEmail = ({
  firstName = "",
  verifyUrl,
  siteName,
  locale = "he",
}: VerificationEmailProps) => {
  const isHebrew = locale === "he";

  return (
    <Html dir={isHebrew ? "rtl" : "ltr"}>
      <Head />
      <Preview>
        {isHebrew
          ? `אימות כתובת האימייל שלך - ${siteName}`
          : `Verify your email address - ${siteName}`}
      </Preview>
      <Tailwind>
        <Body className="bg-white font-sans">
          <Container className="mx-auto py-5 pb-12">
            <Icons.logo className="m-auto block size-10" />
            <Text className="text-base">
              {isHebrew ? `שלום ${firstName},` : `Hi ${firstName},`}
            </Text>
            <Text className="text-base">
              {isHebrew
                ? `תודה שנרשמת ל-${siteName}! לחצ/י על הכפתור למטה כדי לאמת את כתובת האימייל שלך.`
                : `Thanks for signing up for ${siteName}! Click the button below to verify your email address.`}
            </Text>
            <Section className="my-5 text-center">
              <Button
                className="inline-block rounded-md bg-zinc-900 px-4 py-2 text-base text-white no-underline"
                href={verifyUrl}
              >
                {isHebrew ? "אמת את האימייל שלי" : "Verify Email"}
              </Button>
            </Section>
            <Text className="text-base">
              {isHebrew
                ? "הקישור תקף ל-24 שעות."
                : "This link is valid for 24 hours."}
            </Text>
            <Text className="text-base">
              {isHebrew
                ? "אם לא נרשמת לאתר שלנו, ניתן להתעלם מהודעה זו."
                : "If you didn't create an account with us, you can safely ignore this email."}
            </Text>
            <Hr className="my-4 border-t-2 border-gray-300" />
            <Text className="text-sm text-gray-600">
              {siteName}
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
