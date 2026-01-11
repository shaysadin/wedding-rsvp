// RSVP pages inherit html/body from app/(public)/layout.tsx

interface RsvpLayoutProps {
  children: React.ReactNode;
}

export default function RsvpLayout({ children }: RsvpLayoutProps) {
  return <>{children}</>;
}
