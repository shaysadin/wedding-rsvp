import { Navbar, Footer, DivideX } from "@/components/nodus";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
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
