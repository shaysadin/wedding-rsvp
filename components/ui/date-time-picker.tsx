"use client";

import * as React from "react";
import { format, setMonth, setYear, addMonths, subMonths } from "date-fns";
import { he, enUS } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  locale?: string;
  className?: string;
}

// Month names for dropdowns
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTHS_HE = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  locale = "en",
  className,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(value);
  const [isOpen, setIsOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(value || new Date());

  const isHebrew = locale === "he";
  const dateLocale = isHebrew ? he : enUS;
  const monthNames = isHebrew ? MONTHS_HE : MONTHS_EN;

  // Generate hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Generate minutes (0, 15, 30, 45)
  const minutes = [0, 15, 30, 45];

  // Generate years (current year to +5 years for weddings)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const selectedHour = date ? date.getHours() : undefined;
  const selectedMinute = date ? Math.floor(date.getMinutes() / 15) * 15 : undefined;

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (date) {
        newDate.setHours(date.getHours());
        newDate.setMinutes(date.getMinutes());
      } else {
        // Default to 18:00 for new selections (common wedding time)
        newDate.setHours(18);
        newDate.setMinutes(0);
      }
      setDate(newDate);
      onChange?.(newDate);
    }
  };

  const handleTimeChange = (type: "hour" | "minute", valueStr: string) => {
    const numValue = parseInt(valueStr, 10);
    const newDate = date ? new Date(date) : new Date();

    if (type === "hour") {
      newDate.setHours(numValue);
    } else {
      newDate.setMinutes(numValue);
    }

    setDate(newDate);
    onChange?.(newDate);
  };

  const handleMonthChange = (monthStr: string) => {
    const monthIndex = parseInt(monthStr, 10);
    setCalendarMonth(setMonth(calendarMonth, monthIndex));
  };

  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr, 10);
    setCalendarMonth(setYear(calendarMonth, year));
  };

  const handlePrevMonth = () => {
    setCalendarMonth(subMonths(calendarMonth, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(addMonths(calendarMonth, 1));
  };

  const formatHour = (hour: number) => {
    return hour.toString().padStart(2, "0");
  };

  const formatMinute = (minute: number) => {
    return minute.toString().padStart(2, "0");
  };

  React.useEffect(() => {
    setDate(value);
    if (value) {
      setCalendarMonth(value);
    }
  }, [value]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="me-2 h-4 w-4" />
          {date ? (
            <span>
              {format(date, isHebrew ? "dd/MM/yyyy" : "PPP", { locale: dateLocale })}
              {" "}
              <span className="text-muted-foreground">
                {format(date, "HH:mm")}
              </span>
            </span>
          ) : (
            <span>{placeholder || (isHebrew ? "בחר תאריך ושעה" : "Pick a date and time")}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          {/* Calendar Section */}
          <div className="p-3">
            {/* Month/Year Navigation Header */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                <Select
                  value={calendarMonth.getMonth().toString()}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="h-8 w-[110px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((month, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={calendarMonth.getFullYear().toString()}
                  onValueChange={handleYearChange}
                >
                  <SelectTrigger className="h-8 w-[80px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Picker */}
            <DayPicker
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              locale={dateLocale}
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              showOutsideDays
              fixedWeeks
              hideNavigation
              classNames={{
                months: "flex flex-col",
                month: "space-y-2",
                month_caption: "hidden",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                week: "flex w-full mt-1",
                day: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day_button: cn(
                  buttonVariants({ variant: "ghost" }),
                  "size-9 p-0 font-normal aria-selected:opacity-100"
                ),
                selected: "bg-primary rounded-lg text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                today: "bg-accent text-accent-foreground rounded-lg",
                outside: "text-muted-foreground opacity-50",
                disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                hidden: "invisible",
              }}
            />
          </div>

          {/* Time Picker Section */}
          <div className="border-t sm:border-t-0 sm:border-s p-3 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              {isHebrew ? "שעה" : "Time"}
            </div>

            <div className="flex gap-2">
              {/* Hour Select */}
              <Select
                value={selectedHour?.toString()}
                onValueChange={(val) => handleTimeChange("hour", val)}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder={isHebrew ? "שעה" : "Hour"} />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour.toString()}>
                      {formatHour(hour)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="flex items-center text-xl font-medium">:</span>

              {/* Minute Select */}
              <Select
                value={selectedMinute?.toString()}
                onValueChange={(val) => handleTimeChange("minute", val)}
              >
                <SelectTrigger className="w-[70px]">
                  <SelectValue placeholder={isHebrew ? "דקות" : "Min"} />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute.toString()}>
                      {formatMinute(minute)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick time presets */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {[
                { label: isHebrew ? "קבלת פנים" : "Reception", time: "17:00" },
                { label: isHebrew ? "חופה" : "Ceremony", time: "18:00" },
                { label: isHebrew ? "ערב" : "Evening", time: "19:00" },
                { label: isHebrew ? "לילה" : "Night", time: "20:00" },
              ].map((preset) => {
                const [h, m] = preset.time.split(":").map(Number);
                return (
                  <Button
                    key={preset.time}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      const newDate = date ? new Date(date) : new Date();
                      newDate.setHours(h, m, 0, 0);
                      setDate(newDate);
                      onChange?.(newDate);
                    }}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>

            {/* Done button */}
            <Button
              size="sm"
              className="mt-2"
              onClick={() => setIsOpen(false)}
            >
              {isHebrew ? "אישור" : "Done"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
