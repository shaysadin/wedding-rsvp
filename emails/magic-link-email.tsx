import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type MagicLinkEmailProps = {
  actionUrl: string;
  firstName: string;
  mailType: "login" | "register";
  siteName: string;
  locale?: string;
};

export const MagicLinkEmail = ({
  firstName = "",
  actionUrl,
  mailType,
  siteName,
  locale = "he",
}: MagicLinkEmailProps) => {
  const isHebrew = locale === "he";

  const content = {
    preview: isHebrew
      ? mailType === "login"
        ? `התחברות ל-${siteName}`
        : `ברוכים הבאים ל-${siteName}`
      : mailType === "login"
        ? `Sign in to ${siteName}`
        : `Welcome to ${siteName}`,
    greeting: isHebrew ? `שלום ${firstName},` : `Hi ${firstName},`,
    welcomeText: isHebrew
      ? mailType === "login"
        ? `לחצ/י על הכפתור למטה כדי להתחבר לחשבון שלך ב-${siteName}.`
        : `תודה שנרשמת ל-${siteName}! לחצ/י על הכפתור למטה כדי להפעיל את החשבון שלך.`
      : mailType === "login"
        ? `Click the button below to sign in to your ${siteName} account.`
        : `Thanks for signing up for ${siteName}! Click the button below to activate your account.`,
    buttonText: isHebrew
      ? mailType === "login"
        ? "התחברות לחשבון"
        : "הפעלת החשבון"
      : mailType === "login"
        ? "Sign In"
        : "Activate Account",
    expiryText: isHebrew
      ? "הקישור תקף ל-24 שעות בלבד וניתן להשתמש בו פעם אחת."
      : "This link expires in 24 hours and can only be used once.",
    securityText: isHebrew
      ? mailType === "login"
        ? "אם לא ניסית להתחבר לחשבון שלך, ניתן להתעלם מהודעה זו."
        : null
      : mailType === "login"
        ? "If you didn't try to log into your account, you can safely ignore this email."
        : null,
    footer: isHebrew
      ? `נשלח על ידי ${siteName}`
      : `Sent by ${siteName}`,
  };

  const textAlign = isHebrew ? "right" : "left";

  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={logoSection}>
            <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto" }}>
              <tr>
                <td>
                  <div style={logoContainer}>
                    <span style={logoEmoji}>💍</span>
                  </div>
                </td>
              </tr>
            </table>
            <Text style={siteTitleStyle}>{siteName}</Text>
          </Section>

          {/* Main Content */}
          <Section style={{ ...contentSection, direction: isHebrew ? "rtl" : "ltr" }}>
            <Text style={{ ...greetingStyle, textAlign }}>{content.greeting}</Text>
            <Text style={{ ...bodyTextStyle, textAlign }}>{content.welcomeText}</Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto" }}>
              <tr>
                <td>
                  <Button href={actionUrl} style={buttonStyle}>
                    {content.buttonText}
                  </Button>
                </td>
              </tr>
            </table>
          </Section>

          {/* Expiry Notice */}
          <Section style={{ ...noticeSection, direction: isHebrew ? "rtl" : "ltr" }}>
            <Text style={{ ...noticeText, textAlign: "center" }}>{content.expiryText}</Text>
          </Section>

          {/* Security Notice */}
          {content.securityText && (
            <Section style={{ direction: isHebrew ? "rtl" : "ltr" }}>
              <Text style={{ ...securityTextStyle, textAlign }}>{content.securityText}</Text>
            </Section>
          )}

          <Hr style={hr} />

          {/* Footer */}
          <Text style={footer}>{content.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "32px 40px",
  borderRadius: "12px",
  maxWidth: "500px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "32px",
};

const logoContainer = {
  width: "60px",
  height: "60px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #fce7f3 0%, #fed7aa 100%)",
  display: "inline-block",
  textAlign: "center" as const,
  lineHeight: "60px",
};

const logoEmoji = {
  fontSize: "28px",
  lineHeight: "60px",
};

const siteTitleStyle = {
  fontSize: "20px",
  fontWeight: "700" as const,
  color: "#1f2937",
  margin: "16px 0 0 0",
  textAlign: "center" as const,
};

const contentSection = {
  marginBottom: "24px",
};

const greetingStyle = {
  fontSize: "16px",
  color: "#374151",
  marginBottom: "16px",
};

const bodyTextStyle = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#4b5563",
  margin: "0",
};

const buttonSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const buttonStyle = {
  background: "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const noticeSection = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};

const noticeText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

const securityTextStyle = {
  fontSize: "14px",
  color: "#6b7280",
  marginBottom: "16px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  margin: "0",
};
