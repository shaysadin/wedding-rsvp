"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Context to track if a visible DialogTitle has been rendered
interface DialogContextValue {
  hasVisibleTitle: boolean;
  setHasVisibleTitle: (value: boolean) => void;
  screenReaderTitle: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext() {
  return React.useContext(DialogContext)
}

// Hook for swipe-to-dismiss on mobile bottom sheets
function useSwipeToDismiss(onDismiss: () => void, enabled: boolean = true) {
  const [dragY, setDragY] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const startY = React.useRef(0)
  const currentY = React.useRef(0)

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    // Only enable drag from the handle area (first 60px from top)
    const touch = e.touches[0]
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const touchY = touch.clientY - rect.top

    if (touchY <= 60) {
      startY.current = touch.clientY
      currentY.current = touch.clientY
      setIsDragging(true)
    }
  }, [enabled])

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isDragging || !enabled) return
    const touch = e.touches[0]
    currentY.current = touch.clientY
    const delta = Math.max(0, currentY.current - startY.current)
    setDragY(delta)
  }, [isDragging, enabled])

  const handleTouchEnd = React.useCallback(() => {
    if (!isDragging || !enabled) return
    const delta = currentY.current - startY.current

    // If dragged more than 100px down, dismiss
    if (delta > 100) {
      onDismiss()
    }

    setDragY(0)
    setIsDragging(false)
    startY.current = 0
    currentY.current = 0
  }, [isDragging, enabled, onDismiss])

  return {
    dragY,
    isDragging,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const dialogContentVariants = cva(
  cn(
    // Base styles
    "fixed z-[61] flex flex-col bg-card",
    // Mobile: bottom sheet style with gap from top, full width, rounded top corners
    "inset-x-0 bottom-0 top-3 w-full rounded-t-2xl border border-b-0 border-border/50 shadow-xl",
    // Desktop: centered modal with all rounded corners
    "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-border/50",
    // Animations
    "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
    // Mobile slide up from bottom, desktop zoom
    "data-[state=closed]:slide-out-to-bottom-[100%] data-[state=open]:slide-in-from-bottom-[100%] sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
  ),
  {
    variants: {
      size: {
        sm: "sm:max-w-sm sm:w-full",
        default: "sm:max-w-md sm:w-full",
        md: "sm:max-w-lg sm:w-full",
        lg: "sm:max-w-2xl sm:w-full",
        xl: "sm:max-w-4xl sm:w-full",
        full: "sm:max-w-[95vw] sm:w-[95vw]",
        auto: "sm:w-auto sm:max-w-[90vw]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  hideCloseButton?: boolean;
  noWrapper?: boolean;
  /** Visually hidden title for screen readers when no visible DialogTitle is used */
  screenReaderTitle?: string;
}

// Internal component for the fallback hidden title
function DialogFallbackTitle() {
  const context = useDialogContext()

  if (!context || context.hasVisibleTitle) {
    return null
  }

  return (
    <DialogPrimitive.Title className="sr-only">
      {context.screenReaderTitle}
    </DialogPrimitive.Title>
  )
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, size, hideCloseButton, noWrapper, dir, screenReaderTitle = "Dialog", ...props }, ref) => {
  // Get document direction for RTL support in portal (if not explicitly set)
  const [autoDir, setAutoDir] = React.useState<"ltr" | "rtl" | undefined>(undefined)
  const [isMobile, setIsMobile] = React.useState(false)
  const [hasVisibleTitle, setHasVisibleTitle] = React.useState(false)
  const closeRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!dir) {
      const htmlDir = document.documentElement.dir as "ltr" | "rtl"
      if (htmlDir === "rtl" || htmlDir === "ltr") {
        setAutoDir(htmlDir)
      }
    }
  }, [dir])

  // Check if mobile on mount
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Swipe to dismiss handler
  const handleDismiss = React.useCallback(() => {
    closeRef.current?.click()
  }, [])

  const { dragY, isDragging, handlers } = useSwipeToDismiss(handleDismiss, isMobile)

  const contextValue = React.useMemo(() => ({
    hasVisibleTitle,
    setHasVisibleTitle,
    screenReaderTitle,
  }), [hasVisibleTitle, screenReaderTitle])

  return (
    <DialogContext.Provider value={contextValue}>
      <DialogPortal>
        <DialogOverlay style={isDragging ? { opacity: Math.max(0.2, 1 - dragY / 300) } : undefined} />
        <DialogPrimitive.Content
          ref={ref}
          dir={dir || autoDir}
          aria-describedby={undefined}
          className={cn(dialogContentVariants({ size }), className)}
          style={
            isMobile && dragY > 0
              ? {
                  transform: `translateY(${dragY}px)`,
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                }
              : undefined
          }
          {...handlers}
          {...props}
        >
          {/* Mobile drag handle indicator */}
          <div
            className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/40 sm:hidden cursor-grab active:cursor-grabbing"
          />
          {/* Fallback visually hidden title for dialogs without visible DialogTitle */}
          <DialogFallbackTitle />
          {noWrapper ? (
            children
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
              {children}
            </div>
          )}
          <DialogPrimitive.Close
            ref={closeRef}
            className={cn(
              "absolute end-3 top-4 rounded-lg p-1.5 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground sm:end-4 sm:top-4 sm:p-1 z-10",
              hideCloseButton && "sr-only"
            )}
          >
            <X className="size-5 sm:size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogContext.Provider>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-start",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const context = useDialogContext()

  // Register that a visible title exists
  React.useEffect(() => {
    if (context) {
      context.setHasVisibleTitle(true)
      return () => context.setHasVisibleTitle(false)
    }
  }, [context])

  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
})
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
