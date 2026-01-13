"use client";

import { cn } from "@/lib/utils";

interface CoupleLogoProps {
  className?: string;
}

// Elegant script style - Maya & David
export const CoupleLogo1 = ({ className }: CoupleLogoProps) => (
  <div className={cn("font-serif text-2xl tracking-wide", className)}>
    <span className="italic" style={{ fontFamily: "Georgia, serif" }}>
      Maya <span className="text-brand">&</span> David
    </span>
  </div>
);

// Elegant flowing script - Noa & Yosef
export const CoupleLogo2 = ({ className }: CoupleLogoProps) => (
  <div className={cn("text-2xl", className)}>
    <span className="font-light tracking-wide" style={{ fontFamily: "Baskerville, Didot, Georgia, serif" }}>
      Noa <span className="text-brand italic font-normal">&</span> Yosef
    </span>
  </div>
);

// Classic elegant - Rachel
export const CoupleLogo3 = ({ className }: CoupleLogoProps) => (
  <div className={cn("text-2xl font-medium tracking-tight", className)}>
    <span style={{ fontFamily: "Palatino, Times New Roman, serif" }}>
      Rachel <span className="text-brand italic">Mizrachi</span>
    </span>
  </div>
);

// Romantic cursive style - Shira & Omer
export const CoupleLogo4 = ({ className }: CoupleLogoProps) => (
  <div className={cn("text-2xl", className)}>
    <span className="italic font-light" style={{ fontFamily: "Brush Script MT, cursive, Georgia, serif" }}>
      Shira <span className="text-brand not-italic">&hearts;</span> Omer
    </span>
  </div>
);

// Bold modern - Tamar & Eli
export const CoupleLogo5 = ({ className }: CoupleLogoProps) => (
  <div className={cn("text-xl font-bold tracking-tight", className)}>
    <span style={{ fontFamily: "Impact, Arial Black, sans-serif", fontWeight: 600 }}>
      TAMAR <span className="text-brand font-light">&</span> ELI
    </span>
  </div>
);

// Delicate serif - Liora & Amit
export const CoupleLogo6 = ({ className }: CoupleLogoProps) => (
  <div className={cn("text-2xl font-extralight tracking-widest", className)}>
    <span style={{ fontFamily: "Garamond, Georgia, serif" }}>
      Liora <span className="text-brand">&bull;</span> Amit
    </span>
  </div>
);

// Playful modern - Michal & Ron
export const CoupleLogo7 = ({ className }: CoupleLogoProps) => (
  <div className={cn("text-xl", className)}>
    <span className="font-medium" style={{ fontFamily: "Verdana, sans-serif" }}>
      Michal <span className="text-brand rotate-12 inline-block">&</span> Ron
    </span>
  </div>
);

// Sophisticated - Yael & Daniel
export const CoupleLogo8 = ({ className }: CoupleLogoProps) => (
  <div className={cn("text-xl tracking-[0.15em]", className)}>
    <span className="font-normal uppercase" style={{ fontFamily: "Optima, Segoe UI, sans-serif" }}>
      Yael <span className="text-brand lowercase italic">and</span> Daniel
    </span>
  </div>
);

// Map of all couple logos for easy access
export const coupleLogos = {
  1: CoupleLogo1,
  2: CoupleLogo2,
  3: CoupleLogo3,
  4: CoupleLogo4,
  5: CoupleLogo5,
  6: CoupleLogo6,
  7: CoupleLogo7,
  8: CoupleLogo8,
};

// Generic couple logo component that renders based on index
export const CoupleLogo = ({
  index,
  className
}: {
  index: number;
  className?: string;
}) => {
  const LogoComponent = coupleLogos[index as keyof typeof coupleLogos];
  if (!LogoComponent) return null;
  return <LogoComponent className={className} />;
};
