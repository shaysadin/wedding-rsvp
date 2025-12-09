"use client";

import { useState } from "react";
import { Monitor, Smartphone, RotateCcw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type DeviceType = "desktop" | "mobile";

interface DevicePreviewProps {
  children: React.ReactNode;
  previewUrl?: string;
  isRTL?: boolean;
}

export function DevicePreview({ children, previewUrl, isRTL }: DevicePreviewProps) {
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [key, setKey] = useState(0);

  const handleRefresh = () => setKey((k) => k + 1);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Device Selector Header */}
      <div className="shrink-0 flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-1 p-0.5 bg-muted rounded-lg">
          <button
            onClick={() => setDevice("desktop")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              device === "desktop"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setDevice("mobile")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              device === "mobile"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mobile</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {previewUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => window.open(previewUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 min-h-0 overflow-auto bg-muted/20 p-4">
        <div
          className={cn(
            "mx-auto h-full transition-all duration-300",
            device === "desktop" ? "w-full max-w-full" : "w-[375px]"
          )}
        >
          {device === "desktop" ? (
            // Browser Frame
            <div className="flex flex-col rounded-lg border bg-background shadow-lg overflow-hidden max-h-full">
              {/* Browser Chrome */}
              <div className="flex shrink-0 items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                {/* Traffic Lights */}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                {/* URL Bar */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-3 py-1 bg-background rounded-md text-xs text-muted-foreground max-w-md w-full">
                    <span className="truncate">
                      {previewUrl || "rsvp.yoursite.com/event"}
                    </span>
                  </div>
                </div>
              </div>
              {/* Browser Content */}
              <div key={key} className="flex-1 min-h-0 overflow-auto">
                {children}
              </div>
            </div>
          ) : (
            // Mobile Phone Frame
            <div className="mx-auto w-[30vw]">
              <div className="relative rounded-[3rem] border-[12px] border-gray-800 bg-gray-800 shadow-xl">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-10" />
                {/* Screen */}
                <div className="relative rounded-[2.5rem] overflow-hidden bg-background">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between px-6 py-2 bg-background text-xs">
                    <span className="font-medium">9:41</span>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3C7.46 3 3.34 4.78.29 7.67c-.18.18-.29.43-.29.71 0 .28.11.53.29.71l2.48 2.48c.18.18.43.29.71.29.27 0 .52-.11.7-.28.79-.74 1.69-1.36 2.66-1.85.33-.16.56-.5.56-.9v-3.1c1.45-.48 3-.73 4.6-.73s3.15.25 4.6.73v3.1c0 .4.23.74.56.9.98.49 1.87 1.12 2.67 1.85.18.18.43.28.7.28.28 0 .53-.11.71-.29l2.48-2.48c.18-.18.29-.43.29-.71 0-.28-.11-.53-.29-.71C20.66 4.78 16.54 3 12 3z"/>
                      </svg>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17 4h-3V2h-4v2H7v18h10V4zm-2 16H9V6h6v14z"/>
                      </svg>
                    </div>
                  </div>
                  {/* Content */}
                  <div key={key} className="max-h-[60vh] overflow-auto">
                    {children}
                  </div>
                  {/* Home Indicator */}
                  <div className="flex justify-center py-2 bg-background">
                    <div className="w-32 h-1 bg-gray-400 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
