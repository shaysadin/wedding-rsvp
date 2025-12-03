"use client";

import { RsvpPageSettings, CardStyle } from "@prisma/client";
import { cn } from "@/lib/utils";

interface RsvpPageWrapperProps {
  settings: RsvpPageSettings | null;
  children: React.ReactNode;
}

const cardStyles: Record<CardStyle, string> = {
  FLAT: "",
  ELEVATED: "shadow-xl",
  BORDERED: "border-2",
  GLASS: "backdrop-blur-md bg-white/80 dark:bg-black/80",
};

const fontSizeClasses: Record<string, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

export function RsvpPageWrapper({ settings, children }: RsvpPageWrapperProps) {
  // Build inline styles based on settings
  const backgroundStyle: React.CSSProperties = {};
  const cardStyle: React.CSSProperties = {};
  const overlayStyle: React.CSSProperties = {};

  if (settings) {
    // Background
    if (settings.backgroundType === "COLOR" && settings.backgroundColor) {
      backgroundStyle.backgroundColor = settings.backgroundColor;
    } else if (settings.backgroundType === "IMAGE" && settings.backgroundImage) {
      backgroundStyle.backgroundImage = `url(${settings.backgroundImage})`;
      backgroundStyle.backgroundSize = "cover";
      backgroundStyle.backgroundPosition = "center";
      backgroundStyle.backgroundAttachment = "fixed";
    } else if (settings.backgroundType === "GRADIENT") {
      const primary = settings.primaryColor || "#f0f0f0";
      const secondary = settings.secondaryColor || "#ffffff";
      backgroundStyle.background = `linear-gradient(135deg, ${primary}, ${secondary})`;
    }

    // Background blur
    if (settings.backgroundBlur && settings.backgroundBlur > 0) {
      backgroundStyle.filter = `blur(${settings.backgroundBlur}px)`;
    }

    // Overlay
    if (settings.backgroundOverlay && settings.backgroundOverlay > 0) {
      overlayStyle.backgroundColor = "black";
      overlayStyle.opacity = settings.backgroundOverlay;
    }

    // Card
    if (settings.cardBackground) {
      cardStyle.backgroundColor = settings.cardBackground;
    }
    if (settings.cardBorderRadius !== null && settings.cardBorderRadius !== undefined) {
      cardStyle.borderRadius = `${settings.cardBorderRadius}px`;
    }
    if (settings.cardPadding !== null && settings.cardPadding !== undefined) {
      cardStyle.padding = `${settings.cardPadding}px`;
    }
    // Apply opacity via rgba background instead of opacity property for better backdrop blur support
    if (settings.cardOpacity !== null && settings.cardOpacity !== undefined && settings.cardBackground) {
      const hex = settings.cardBackground.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      cardStyle.backgroundColor = `rgba(${r}, ${g}, ${b}, ${settings.cardOpacity})`;
    }
    // Card blur (backdrop blur)
    if (settings.cardBlur !== null && settings.cardBlur !== undefined && settings.cardBlur > 0) {
      cardStyle.backdropFilter = `blur(${settings.cardBlur}px)`;
      cardStyle.WebkitBackdropFilter = `blur(${settings.cardBlur}px)`;
    }
    if (settings.textColor) {
      cardStyle.color = settings.textColor;
    }

    // Typography - apply CSS variables for custom fonts
    if (settings.fontFamily) {
      cardStyle.fontFamily = settings.fontFamily;
    }
  }

  const maxWidth = settings?.cardMaxWidth ? `${settings.cardMaxWidth}px` : "28rem"; // Default max-w-md is 28rem

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background Layer */}
      <div
        className="fixed inset-0 -z-20"
        style={backgroundStyle}
      />

      {/* Overlay for background images */}
      {settings?.backgroundType === "IMAGE" && settings.backgroundOverlay && settings.backgroundOverlay > 0 && (
        <div
          className="fixed inset-0 -z-10"
          style={overlayStyle}
        />
      )}

      {/* Content */}
      <div
        className={cn(
          "relative flex min-h-screen items-center justify-center p-4",
          settings?.contentAlignment === "left" && "justify-start",
          settings?.contentAlignment === "right" && "justify-end"
        )}
      >
        <div
          className={cn(
            "w-full rounded-xl bg-white p-6 dark:bg-gray-900",
            settings?.cardStyle ? cardStyles[settings.cardStyle] : cardStyles.ELEVATED,
            settings?.fontSize ? fontSizeClasses[settings.fontSize] : ""
          )}
          style={{
            ...cardStyle,
            maxWidth,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// Preview component for the customization page
export function RsvpPagePreview({
  settings,
  children,
  scale = 0.5,
}: RsvpPageWrapperProps & { scale?: number }) {
  const backgroundStyle: React.CSSProperties = {};
  const cardStyle: React.CSSProperties = {};
  const overlayStyle: React.CSSProperties = {};

  if (settings) {
    if (settings.backgroundType === "COLOR" && settings.backgroundColor) {
      backgroundStyle.backgroundColor = settings.backgroundColor;
    } else if (settings.backgroundType === "IMAGE" && settings.backgroundImage) {
      backgroundStyle.backgroundImage = `url(${settings.backgroundImage})`;
      backgroundStyle.backgroundSize = "cover";
      backgroundStyle.backgroundPosition = "center";
    } else if (settings.backgroundType === "GRADIENT") {
      const primary = settings.primaryColor || "#f0f0f0";
      const secondary = settings.secondaryColor || "#ffffff";
      backgroundStyle.background = `linear-gradient(135deg, ${primary}, ${secondary})`;
    }

    if (settings.backgroundOverlay && settings.backgroundOverlay > 0) {
      overlayStyle.backgroundColor = "black";
      overlayStyle.opacity = settings.backgroundOverlay;
    }

    if (settings.cardBackground) {
      cardStyle.backgroundColor = settings.cardBackground;
    }
    if (settings.cardBorderRadius !== null && settings.cardBorderRadius !== undefined) {
      cardStyle.borderRadius = `${settings.cardBorderRadius}px`;
    }
    if (settings.cardPadding !== null && settings.cardPadding !== undefined) {
      cardStyle.padding = `${settings.cardPadding}px`;
    }
    if (settings.cardOpacity !== null && settings.cardOpacity !== undefined) {
      cardStyle.opacity = settings.cardOpacity;
    }
    if (settings.textColor) {
      cardStyle.color = settings.textColor;
    }
    if (settings.fontFamily) {
      cardStyle.fontFamily = settings.fontFamily;
    }
  }

  const maxWidth = settings?.cardMaxWidth ? `${settings.cardMaxWidth}px` : "28rem";

  return (
    <div
      className="relative overflow-hidden rounded-lg border shadow-lg"
      style={{
        width: `${100 / scale}%`,
        height: `${100 / scale}%`,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <div className="relative min-h-[600px] w-full" style={backgroundStyle}>
        {settings?.backgroundType === "IMAGE" && settings.backgroundOverlay && settings.backgroundOverlay > 0 && (
          <div className="absolute inset-0" style={overlayStyle} />
        )}
        <div
          className={cn(
            "relative flex min-h-[600px] items-center justify-center p-4",
            settings?.contentAlignment === "left" && "justify-start",
            settings?.contentAlignment === "right" && "justify-end"
          )}
        >
          <div
            className={cn(
              "w-full rounded-xl bg-white p-6 dark:bg-gray-900",
              settings?.cardStyle ? cardStyles[settings.cardStyle] : cardStyles.ELEVATED,
              settings?.fontSize ? fontSizeClasses[settings.fontSize] : ""
            )}
            style={{
              ...cardStyle,
              maxWidth,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
