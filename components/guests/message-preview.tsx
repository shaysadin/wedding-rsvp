"use client";

import { cn } from "@/lib/utils";
import { MessageCircle, Phone, Check, CheckCheck } from "lucide-react";

interface MessagePreviewProps {
  channel: "WHATSAPP" | "SMS";
  message: string;
  isRTL?: boolean;
  hasButtons?: boolean;
  buttons?: { text: string; variant: "accept" | "decline" | "maybe" }[];
  imageUrl?: string;
}

export function MessagePreview({
  channel,
  message,
  isRTL = false,
  hasButtons = false,
  buttons = [],
  imageUrl,
}: MessagePreviewProps) {
  const isWhatsApp = channel === "WHATSAPP";

  return (
    <div className="w-full max-w-[280px] mx-auto">
      {/* Phone Frame */}
      <div className="relative rounded-[2.5rem] bg-gray-900 p-2 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-b-xl z-10" />

        {/* Screen */}
        <div className="rounded-[2rem] overflow-hidden bg-white dark:bg-gray-800">
          {/* Status Bar */}
          <div className="h-8 bg-gray-100 dark:bg-gray-700 flex items-center justify-center px-4">
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* App Header */}
          <div className={cn(
            "h-12 flex items-center gap-2 px-3",
            isWhatsApp
              ? "bg-[#075E54] text-white"
              : "bg-blue-500 text-white"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isWhatsApp ? "bg-[#25D366]" : "bg-blue-400"
            )}>
              {isWhatsApp ? (
                <MessageCircle className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {isRTL ? "אירוע שלי" : "My Event"}
              </p>
              <p className="text-[10px] opacity-80">
                {isWhatsApp ? "WhatsApp Business" : "SMS"}
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <div className={cn(
            "min-h-[300px] p-3",
            isWhatsApp
              ? "bg-[#ECE5DD] dark:bg-[#0b141a]"
              : "bg-gray-50 dark:bg-gray-900"
          )}>
            {/* Message Bubble */}
            <div className={cn(
              "max-w-[90%]",
              isRTL ? "mr-auto" : "ml-auto"
            )}>
              {/* Image Preview (if any) */}
              {imageUrl && (
                <div className="mb-1 rounded-lg overflow-hidden">
                  <div className="w-full h-32 bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-xs text-muted-foreground">
                    {isRTL ? "תמונת הזמנה" : "Invitation Image"}
                  </div>
                </div>
              )}

              {/* Text Bubble */}
              <div className={cn(
                "rounded-lg px-3 py-2 text-sm shadow-sm relative",
                isWhatsApp
                  ? "bg-[#DCF8C6] dark:bg-[#005c4b] text-gray-900 dark:text-white"
                  : cn(
                      isRTL
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        : "bg-blue-500 text-white"
                    )
              )}>
                {/* Bubble tail */}
                <div className={cn(
                  "absolute top-0 w-3 h-3",
                  isRTL ? "-left-1.5" : "-right-1.5",
                  isWhatsApp
                    ? "bg-[#DCF8C6] dark:bg-[#005c4b]"
                    : isRTL
                      ? "bg-white dark:bg-gray-700"
                      : "bg-blue-500",
                  "clip-path-[polygon(100%_0,0_0,100%_100%)]"
                )} style={{
                  clipPath: isRTL
                    ? "polygon(0 0, 100% 0, 0 100%)"
                    : "polygon(100% 0, 0 0, 100% 100%)"
                }} />

                <pre className={cn(
                  "whitespace-pre-wrap font-sans text-xs leading-relaxed",
                  isRTL && "text-right"
                )} dir={isRTL ? "rtl" : "ltr"}>
                  {message || (isRTL ? "תצוגה מקדימה של ההודעה תופיע כאן" : "Message preview will appear here")}
                </pre>

                {/* Timestamp & Read receipt */}
                <div className={cn(
                  "flex items-center gap-1 mt-1",
                  isRTL ? "justify-start" : "justify-end"
                )}>
                  <span className={cn(
                    "text-[9px]",
                    isWhatsApp
                      ? "text-gray-500 dark:text-gray-400"
                      : isRTL ? "text-gray-400" : "text-blue-100"
                  )}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isWhatsApp && (
                    <CheckCheck className="h-3 w-3 text-blue-500" />
                  )}
                </div>
              </div>

              {/* Interactive Buttons (WhatsApp only) */}
              {hasButtons && isWhatsApp && buttons.length > 0 && (
                <div className="mt-1 space-y-1">
                  {buttons.map((button, index) => (
                    <button
                      key={index}
                      className={cn(
                        "w-full py-2 rounded-lg text-xs font-medium border shadow-sm",
                        button.variant === "accept" && "bg-white dark:bg-gray-800 text-green-600 border-green-200",
                        button.variant === "decline" && "bg-white dark:bg-gray-800 text-red-600 border-red-200",
                        button.variant === "maybe" && "bg-white dark:bg-gray-800 text-gray-600 border-gray-200"
                      )}
                    >
                      {button.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input Area */}
          <div className={cn(
            "h-12 flex items-center gap-2 px-3",
            isWhatsApp
              ? "bg-[#F0F0F0] dark:bg-[#1f2c34]"
              : "bg-gray-100 dark:bg-gray-800"
          )}>
            <div className="flex-1 h-8 rounded-full bg-white dark:bg-gray-700 px-3 flex items-center">
              <span className="text-[10px] text-gray-400">
                {isRTL ? "הקלד הודעה..." : "Type a message..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
