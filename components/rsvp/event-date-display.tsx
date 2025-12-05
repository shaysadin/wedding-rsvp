"use client";

import { useState, useEffect } from "react";
import { format, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { Clock, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type DateDisplayStyle = "CARD" | "CALENDAR" | "MINIMAL";

interface EventDateDisplayProps {
  eventDate: Date;
  venue?: string | null;
  location: string;
  isRTL?: boolean;
  // Display style
  displayStyle?: DateDisplayStyle;
  showCountdown?: boolean;
  showTimeSection?: boolean;
  showAddressSection?: boolean;
  // Internal gap between elements
  internalGap?: number;
  // Base styling
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  // Enhanced Date Card Settings
  backgroundImage?: string;
  overlay?: number;
  blur?: number;
  padding?: number;
  shadow?: boolean;
  dateDayFontSize?: number;
  dateMonthFontSize?: number;
  dateYearFontSize?: number;
  // Time Section Styling
  timeSectionBackground?: string;
  timeSectionTextColor?: string;
  timeSectionBorderRadius?: number;
  timeSectionBorderWidth?: number;
  timeSectionBorderColor?: string;
  timeSectionPadding?: number;
  timeFontSize?: number;
  // Address Section Styling
  addressSectionBackground?: string;
  addressSectionTextColor?: string;
  addressSectionBorderRadius?: number;
  addressSectionBorderWidth?: number;
  addressSectionBorderColor?: string;
  addressSectionPadding?: number;
  addressFontSize?: number;
  // Countdown Section Styling
  countdownSectionBackground?: string;
  countdownSectionTextColor?: string;
  countdownSectionBorderRadius?: number;
  countdownSectionBorderWidth?: number;
  countdownSectionBorderColor?: string;
  countdownSectionPadding?: number;
  countdownBoxBackground?: string;
  countdownBoxTextColor?: string;
  countdownBoxBorderWidth?: number;
  countdownBoxBorderColor?: string;
  countdownBoxBorderRadius?: number;
  countdownBoxSize?: number;
  countdownLabelColor?: string;
  countdownNumberFontSize?: number;
  countdownLabelFontSize?: number;
}

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function EventDateDisplay({
  eventDate,
  venue,
  location,
  isRTL = false,
  displayStyle = "CARD",
  showCountdown = true,
  showTimeSection = true,
  showAddressSection = true,
  internalGap = 12,
  backgroundColor,
  textColor,
  accentColor = "#1a1a1a",
  borderRadius = 16,
  borderWidth,
  borderColor,
  backgroundImage,
  overlay = 0.3,
  blur = 0,
  padding = 24,
  shadow = true,
  dateDayFontSize = 56,
  dateMonthFontSize = 16,
  dateYearFontSize,
  timeSectionBackground,
  timeSectionTextColor,
  timeSectionBorderRadius = 12,
  timeSectionBorderWidth,
  timeSectionBorderColor,
  timeSectionPadding,
  timeFontSize = 14,
  addressSectionBackground,
  addressSectionTextColor,
  addressSectionBorderRadius = 12,
  addressSectionBorderWidth,
  addressSectionBorderColor,
  addressSectionPadding,
  addressFontSize = 13,
  countdownSectionBackground,
  countdownSectionTextColor,
  countdownSectionBorderRadius = 12,
  countdownSectionBorderWidth,
  countdownSectionBorderColor,
  countdownSectionPadding,
  countdownBoxBackground,
  countdownBoxTextColor,
  countdownBoxBorderWidth,
  countdownBoxBorderColor,
  countdownBoxBorderRadius,
  countdownBoxSize,
  countdownLabelColor,
  countdownNumberFontSize = 18,
  countdownLabelFontSize = 9,
}: EventDateDisplayProps) {
  const dateLocale = isRTL ? he : enUS;
  const [countdown, setCountdown] = useState<CountdownValues | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateCountdown = () => {
      const now = new Date();
      if (eventDate > now) {
        setCountdown({
          days: differenceInDays(eventDate, now),
          hours: differenceInHours(eventDate, now) % 24,
          minutes: differenceInMinutes(eventDate, now) % 60,
          seconds: differenceInSeconds(eventDate, now) % 60,
        });
      } else {
        setCountdown(null);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [eventDate]);

  // MINIMAL style
  if (displayStyle === "MINIMAL") {
    return (
      <div className="flex flex-col" style={{ gap: `${internalGap}px` }} dir={isRTL ? "rtl" : "ltr"}>
        {/* Date Display */}
        <div
          className="flex flex-col items-center gap-1 text-center"
          style={{
            backgroundColor: backgroundColor || undefined,
            color: textColor || undefined,
            borderRadius: borderRadius ? `${borderRadius}px` : undefined,
            borderWidth: borderWidth ? `${borderWidth}px` : undefined,
            borderColor: borderColor || undefined,
            borderStyle: borderWidth ? "solid" : undefined,
            padding: padding ? `${padding}px` : undefined,
          }}
        >
          <div
            className="font-bold leading-none"
            style={{
              color: accentColor,
              fontSize: dateDayFontSize ? `${dateDayFontSize}px` : "48px",
            }}
          >
            {format(eventDate, "d", { locale: dateLocale })}
          </div>
          <div
            className="font-medium opacity-80"
            style={{ fontSize: dateMonthFontSize ? `${dateMonthFontSize}px` : "16px" }}
          >
            {format(eventDate, "MMMM yyyy", { locale: dateLocale })}
          </div>
          <div className="text-sm opacity-60">
            {format(eventDate, "EEEE", { locale: dateLocale })}
          </div>
        </div>

        {/* Time & Address in same row */}
        {(showTimeSection || showAddressSection) && (
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            {showTimeSection && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" style={{ color: accentColor }} />
                <span style={{ fontSize: timeFontSize ? `${timeFontSize}px` : undefined }}>
                  {format(eventDate, "HH:mm")}
                </span>
              </div>
            )}
            {showTimeSection && showAddressSection && (venue || location) && (
              <span className="opacity-30">|</span>
            )}
            {showAddressSection && (venue || location) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" style={{ color: accentColor }} />
                <span style={{ fontSize: addressFontSize ? `${addressFontSize}px` : undefined }}>
                  {venue ? `${venue}` : location}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Countdown Section */}
        {showCountdown && mounted && countdown && (
          <CountdownDisplay
            countdown={countdown}
            isRTL={isRTL}
            accentColor={accentColor}
            boxBackground={countdownBoxBackground}
            boxTextColor={countdownBoxTextColor}
            boxBorderWidth={countdownBoxBorderWidth}
            boxBorderColor={countdownBoxBorderColor}
            boxBorderRadius={countdownBoxBorderRadius}
            boxSize={countdownBoxSize}
            labelColor={countdownLabelColor || countdownSectionTextColor}
            numberFontSize={countdownNumberFontSize}
            labelFontSize={countdownLabelFontSize}
          />
        )}
      </div>
    );
  }

  // CALENDAR style
  if (displayStyle === "CALENDAR") {
    return (
      <div className="flex flex-col items-center w-full" style={{ gap: `${internalGap}px` }} dir={isRTL ? "rtl" : "ltr"}>
        {/* Calendar Card - clean, no background */}
        <div
          className={cn(
            "overflow-hidden border p-4 w-full",
            shadow && "shadow-sm"
          )}
          style={{
            backgroundColor: backgroundColor || "#ffffff",
            borderRadius: borderRadius ? `${borderRadius}px` : "12px",
            borderColor: borderColor || "#e5e7eb",
            maxWidth: "320px",
          }}
        >
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={eventDate}
              month={eventDate}
              locale={dateLocale}
              disabled
              showOutsideDays={false}
              classNames={{
                button_previous: "hidden",
                button_next: "hidden",
                selected: "rounded-lg font-semibold",
                day_button: "size-9 p-0 font-normal aria-selected:opacity-100 rounded-lg",
              }}
              modifiersStyles={accentColor ? {
                selected: {
                  backgroundColor: accentColor,
                  color: "white",
                  fontWeight: 600,
                  opacity: 1,
                  borderRadius: "8px",
                },
              } : undefined}
            />
          </div>
        </div>

        {/* Time & Address in same row */}
        {(showTimeSection || showAddressSection) && (
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            {showTimeSection && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" style={{ color: accentColor }} />
                <span className="font-medium text-accent-foreground" style={{ fontSize: timeFontSize ? `${timeFontSize}px` : undefined }}>
                  {format(eventDate, "HH:mm")}
                </span>
              </div>
            )}
            {showTimeSection && showAddressSection && (venue || location) && (
              <span className="opacity-30">|</span>
            )}
            {showAddressSection && (venue || location) && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" style={{ color: accentColor }} />
                <span className="text-accent-foreground" style={{ fontSize: addressFontSize ? `${addressFontSize}px ` : undefined }}>
                  {venue ? `${venue}` : location}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Countdown Section */}
        {showCountdown && mounted && countdown && (
          <CountdownDisplay
            countdown={countdown}
            isRTL={isRTL}
            accentColor={accentColor}
            boxBackground={countdownBoxBackground}
            boxTextColor={countdownBoxTextColor}
            boxBorderWidth={countdownBoxBorderWidth}
            boxBorderColor={countdownBoxBorderColor}
            boxBorderRadius={countdownBoxBorderRadius}
            boxSize={countdownBoxSize}
            labelColor={countdownLabelColor || countdownSectionTextColor}
            numberFontSize={countdownNumberFontSize}
            labelFontSize={countdownLabelFontSize}
          />
        )}
      </div>
    );
  }

  // CARD style (default) - Date card with time/address/countdown below
  // For white backgrounds, we use a light card with accent-colored text
  const hasBackgroundImage = backgroundImage && backgroundImage.length > 0;
  const useColoredBackground = hasBackgroundImage || backgroundColor;
  const cardTextColor = useColoredBackground ? (textColor || "white") : (accentColor || "#1a1a1a");

  return (
    <div className="flex flex-col" style={{ gap: `${internalGap}px` }} dir={isRTL ? "rtl" : "ltr"}>
      {/* Date Card */}
      <div
        className={cn(
          "relative overflow-hidden",
          shadow && "shadow-md",
          !useColoredBackground && "border"
        )}
        style={{
          borderRadius: borderRadius ? `${borderRadius}px` : undefined,
          borderWidth: useColoredBackground && borderWidth ? `${borderWidth}px` : undefined,
          borderColor: useColoredBackground ? borderColor : "#e5e7eb",
          borderStyle: (useColoredBackground && borderWidth) ? "solid" : undefined,
          backgroundColor: useColoredBackground ? undefined : "#fafafa",
        }}
      >
        {/* Background - only show if we have a colored background */}
        {useColoredBackground && (
          <div
            className="absolute inset-0"
            style={{
              background: hasBackgroundImage
                ? `url(${backgroundImage})`
                : backgroundColor,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: blur ? `blur(${blur}px)` : undefined,
            }}
          />
        )}

        {/* Overlay - only for images */}
        {hasBackgroundImage && overlay > 0 && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${overlay})`,
            }}
          />
        )}

        {/* Content */}
        <div
          className="relative text-center"
          style={{
            padding: padding ? `${padding}px` : "24px",
            color: cardTextColor,
          }}
        >
          {/* Day of Week */}
          <div
            className="text-xs font-medium uppercase tracking-widest"
            style={{ opacity: useColoredBackground ? 0.8 : 0.6 }}
          >
            {format(eventDate, "EEEE", { locale: dateLocale })}
          </div>

          {/* Date Number */}
          <div
            className="my-1 font-bold leading-none tracking-tight"
            style={{ fontSize: dateDayFontSize ? `${dateDayFontSize}px` : "56px" }}
          >
            {format(eventDate, "d", { locale: dateLocale })}
          </div>

          {/* Month & Year */}
          <div
            className="font-medium tracking-wide"
            style={{
              fontSize: dateMonthFontSize ? `${dateMonthFontSize}px` : "16px",
              opacity: useColoredBackground ? 1 : 0.8,
            }}
          >
            {format(eventDate, "MMMM yyyy", { locale: dateLocale })}
          </div>
        </div>
      </div>

      {/* Time & Address in same row - no background */}
      {(showTimeSection || showAddressSection) && (
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          {showTimeSection && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" style={{ color: accentColor || "#1a1a1a" }} />
              <span className="font-medium" style={{ fontSize: timeFontSize ? `${timeFontSize}px` : undefined }}>
                {format(eventDate, "HH:mm")}
              </span>
            </div>
          )}
          {showTimeSection && showAddressSection && (venue || location) && (
            <span className="opacity-30">|</span>
          )}
          {showAddressSection && (venue || location) && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" style={{ color: accentColor || "#1a1a1a" }} />
              <span style={{ fontSize: addressFontSize ? `${addressFontSize}px` : undefined }}>
                {venue ? `${venue}` : location}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Countdown Section - no section background, just boxes */}
      {showCountdown && mounted && countdown && (
        <CountdownDisplay
          countdown={countdown}
          isRTL={isRTL}
          accentColor={accentColor}
          boxBackground={countdownBoxBackground}
          boxTextColor={countdownBoxTextColor}
          boxBorderWidth={countdownBoxBorderWidth}
          boxBorderColor={countdownBoxBorderColor}
          boxBorderRadius={countdownBoxBorderRadius}
          boxSize={countdownBoxSize}
          labelColor={countdownLabelColor}
          numberFontSize={countdownNumberFontSize}
          labelFontSize={countdownLabelFontSize}
        />
      )}
    </div>
  );
}

interface CountdownDisplayProps {
  countdown: CountdownValues;
  isRTL: boolean;
  accentColor?: string;
  boxBackground?: string;
  boxTextColor?: string;
  boxBorderWidth?: number;
  boxBorderColor?: string;
  boxBorderRadius?: number;
  boxSize?: number;
  labelColor?: string;
  numberFontSize?: number;
  labelFontSize?: number;
}

function CountdownDisplay({
  countdown,
  isRTL,
  accentColor,
  boxBackground,
  boxTextColor,
  boxBorderWidth,
  boxBorderColor,
  boxBorderRadius,
  boxSize,
  labelColor,
  numberFontSize = 18,
  labelFontSize = 9,
}: CountdownDisplayProps) {
  const labels = isRTL
    ? { days: "ימים", hours: "שעות", minutes: "דקות", seconds: "שניות" }
    : { days: "Days", hours: "Hrs", minutes: "Min", seconds: "Sec" };

  const size = boxSize || 44;

  // Convert hex color to rgba with opacity for better browser support
  const getColorWithOpacity = (hex: string, opacity: number) => {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const defaultBoxBg = accentColor ? getColorWithOpacity(accentColor, 0.15) : "#f3f4f6";

  return (
    <div className="flex items-center justify-center mt-4 gap-2">
      <CountdownUnit
        value={countdown.seconds}
        label={labels.seconds}
        accentColor={accentColor}
        boxBackground={boxBackground || defaultBoxBg}
        boxTextColor={boxTextColor}
        boxBorderWidth={boxBorderWidth}
        boxBorderColor={boxBorderColor}
        boxBorderRadius={boxBorderRadius}
        size={size}
        fontSize={numberFontSize}
        labelSize={labelFontSize}
        labelColor={labelColor}
      />
        <div className="text-sm font-bold opacity-20" style={{ color: labelColor }}>:</div>
        <CountdownUnit
          value={countdown.minutes}
          label={labels.minutes}
          accentColor={accentColor}
          boxBackground={boxBackground || defaultBoxBg}
          boxTextColor={boxTextColor}
          boxBorderWidth={boxBorderWidth}
          boxBorderColor={boxBorderColor}
          boxBorderRadius={boxBorderRadius}
          size={size}
          fontSize={numberFontSize}
          labelSize={labelFontSize}
          labelColor={labelColor}
        />
        <div className="text-sm font-bold opacity-20" style={{ color: labelColor }}>:</div>
        <CountdownUnit
          value={countdown.hours}
          label={labels.hours}
          accentColor={accentColor}
          boxBackground={boxBackground || defaultBoxBg}
          boxTextColor={boxTextColor}
          boxBorderWidth={boxBorderWidth}
          boxBorderColor={boxBorderColor}
          boxBorderRadius={boxBorderRadius}
          size={size}
          fontSize={numberFontSize}
          labelSize={labelFontSize}
          labelColor={labelColor}
        />
        <div className="text-sm font-bold opacity-20" style={{ color: labelColor }}>:</div>
      <CountdownUnit
        value={countdown.days}
        label={labels.days}
        accentColor={accentColor}
        boxBackground={boxBackground || defaultBoxBg}
        boxTextColor={boxTextColor}
        boxBorderWidth={boxBorderWidth}
        boxBorderColor={boxBorderColor}
        boxBorderRadius={boxBorderRadius}
        size={size}
        fontSize={numberFontSize}
        labelSize={labelFontSize}
        labelColor={labelColor}
      />
    </div>
  );
}

interface CountdownUnitProps {
  value: number;
  label: string;
  accentColor?: string;
  boxBackground?: string;
  boxTextColor?: string;
  boxBorderWidth?: number;
  boxBorderColor?: string;
  boxBorderRadius?: number;
  size: number;
  fontSize: number;
  labelSize: number;
  labelColor?: string;
}

function CountdownUnit({
  value,
  label,
  accentColor,
  boxBackground,
  boxTextColor,
  boxBorderWidth,
  boxBorderColor,
  boxBorderRadius,
  size,
  fontSize,
  labelSize,
  labelColor,
}: CountdownUnitProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="flex items-center justify-center font-semibold tabular-nums"
        style={{
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          padding: "8px 10px",
          fontSize: `${fontSize}px`,
          backgroundColor: boxBackground || "#f3f4f6",
          color: boxTextColor || accentColor || "#374151",
          borderWidth: boxBorderWidth ? `${boxBorderWidth}px` : undefined,
          borderColor: boxBorderColor || undefined,
          borderStyle: boxBorderWidth ? "solid" : undefined,
          borderRadius: boxBorderRadius !== undefined ? `${boxBorderRadius}px` : "12px",
        }}
      >
        {value.toString().padStart(2, "0")}
      </div>
      <span
        className="mt-1 font-medium"
        style={{
          fontSize: `${labelSize}px`,
          color: labelColor || "rgb(107, 114, 128)",
        }}
      >
        {label}
      </span>
    </div>
  );
}
