import "@/styles/globals.css";

// This root layout is a redirect-only layout.
// The actual layout with providers is in app/[locale]/layout.tsx

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
