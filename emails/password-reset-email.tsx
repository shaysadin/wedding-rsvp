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

type PasswordResetEmailProps = {
  resetUrl: string;
  firstName: string;
  siteName: string;
  locale?: string;
};

export const PasswordResetEmail = ({
  firstName = "",
  resetUrl,
  siteName,
  locale = "he",
}: PasswordResetEmailProps) => {
  const isHebrew = locale === "he";

  const content = {
    preview: isHebrew
      ? `איפוס סיסמה - ${siteName}`
      : `Reset your password - ${siteName}`,
    greeting: isHebrew ? `שלום ${firstName},` : `Hi ${firstName},`,
    mainText: isHebrew
      ? `קיבלנו בקשה לאיפוס הסיסמה שלך. לחצ/י על הכפתור למטה כדי ליצור סיסמה חדשה.`
      : `We received a request to reset your password. Click the button below to create a new password.`,
    buttonText: isHebrew ? "איפוס סיסמה" : "Reset Password",
    expiryText: isHebrew
      ? "הקישור תקף לשעה אחת בלבד."
      : "This link is valid for 1 hour only.",
    securityText: isHebrew
      ? "אם לא ביקשת לאפס את הסיסמה שלך, ניתן להתעלם מהודעה זו. הסיסמה שלך תישאר ללא שינוי."
      : "If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.",
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
                    <span style={logoEmoji}>🔐</span>
                  </div>
                </td>
              </tr>
            </table>
            <Text style={siteTitleStyle}>{siteName}</Text>
          </Section>

          {/* Main Content */}
          <Section style={{ ...contentSection, direction: isHebrew ? "rtl" : "ltr" }}>
            <Text style={{ ...greetingStyle, textAlign }}>{content.greeting}</Text>
            <Text style={{ ...bodyTextStyle, textAlign }}>{content.mainText}</Text>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto" }}>
              <tr>
                <td>
                  <Button href={resetUrl} style={buttonStyle}>
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
          <Section style={{ direction: isHebrew ? "rtl" : "ltr" }}>
            <Text style={{ ...securityTextStyle, textAlign }}>{content.securityText}</Text>
          </Section>

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
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};

const noticeText = {
  fontSize: "14px",
  color: "#92400e",
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
