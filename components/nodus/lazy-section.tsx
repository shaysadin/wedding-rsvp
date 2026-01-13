"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

interface LazySectionProps {
  children: ReactNode;
  rootMargin?: string;
  placeholder?: ReactNode;
}

export const LazySection = ({
  children,
  rootMargin = "200px",
  placeholder = <div className="min-h-[400px]" />
}: LazySectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref}>
      {isVisible ? children : placeholder}
    </div>
  );
};
