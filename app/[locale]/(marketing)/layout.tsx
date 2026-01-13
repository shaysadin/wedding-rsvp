import { Navbar, Footer, DivideX } from "@/components/nodus";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <DivideX />
      <main className="flex-1">{children}</main>
      <DivideX />
      <Footer />
    </div>
  );
}
