// Public pages layout - inherits html/body from root layout

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return <>{children}</>;
}
