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
// Uses direct DOM manipulation for smooth 60fps performance
function useSwipeToDismiss(onDismiss: () => void, enabled: boolean = true) {
  const contentRef = React.useRef<HTMLElement | null>(null)
  const overlayRef = React.useRef<HTMLElement | null>(null)
  const startY = React.useRef(0)
  const isDragging = React.useRef(false)

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    // Only enable drag from the handle area (first 60px from top)
    const touch = e.touches[0]
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const touchY = touch.clientY - rect.top

    if (touchY <= 60) {
      startY.current = touch.clientY
      isDragging.current = true
      contentRef.current = target
      // Find the overlay (previous sibling in the portal)
      overlayRef.current = target.previousElementSibling as HTMLElement
      // Remove transition during drag for immediate response
      target.style.transition = 'none'
    }
  }, [enabled])

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !enabled || !contentRef.current) return
    const touch = e.touches[0]
    const delta = Math.max(0, touch.clientY - startY.current)

    // Direct DOM manipulation - no React state updates
    contentRef.current.style.transform = `translateY(${delta}px)`

    // Update overlay opacity
    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(Math.max(0.2, 1 - delta / 300))
    }
  }, [enabled])

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !enabled || !contentRef.current) return

    const touch = e.changedTouches[0]
    const delta = touch.clientY - startY.current

    // Re-enable transition for snap back animation
    contentRef.current.style.transition = 'transform 0.2s ease-out'

    // If dragged more than 100px down, dismiss
    if (delta > 100) {
      // Animate out before dismissing
      contentRef.current.style.transform = 'translateY(100%)'
      // Disable CSS animation to prevent conflict with our JS animation
      contentRef.current.style.animation = 'none'
      if (overlayRef.current) {
        overlayRef.current.style.transition = 'opacity 0.2s ease-out'
        overlayRef.current.style.opacity = '0'
        overlayRef.current.style.animation = 'none'
      }
      setTimeout(onDismiss, 200)
    } else {
      // Snap back
      contentRef.current.style.transform = 'translateY(0)'
      if (overlayRef.current) {
        overlayRef.current.style.opacity = '1'
      }
    }

    isDragging.current = false
    startY.current = 0
  }, [enabled, onDismiss])

  return {
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
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & { style?: React.CSSProperties }
>(({ className, style, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "dialog-overlay fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm",
      className
    )}
    style={style}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const dialogContentVariants = cva(
  // Mobile: bottom sheet style with slide animation
  // Desktop (sm+): centered dialog with zoom animation
  "dialog-content fixed z-[61] gap-4 bg-background shadow-lg inset-x-0 bottom-0 max-h-[96vh] rounded-t-2xl border border-b-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border",
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
>(({ className, children, size, hideCloseButton, noWrapper, dir, screenReaderTitle = "Dialog", style, ...props }, ref) => {
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

  const { handlers } = useSwipeToDismiss(handleDismiss, isMobile)

  const contextValue = React.useMemo(() => ({
    hasVisibleTitle,
    setHasVisibleTitle,
    screenReaderTitle,
  }), [hasVisibleTitle, screenReaderTitle])

  return (
    <DialogContext.Provider value={contextValue}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          dir={dir || autoDir}
          aria-describedby={undefined}
          className={cn(dialogContentVariants({ size }), "flex flex-col pt-2 px-4 pb-4 sm:p-6 min-h-[50vh]", className)}
          style={{
            ...style,
            minHeight: "50vh",
          }}
          {...(isMobile ? handlers : {})}
          {...props}
        >
          {/* Mobile drag handle indicator - matches Sheet */}
          <div
            className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/40 sm:hidden cursor-grab active:cursor-grabbing"
          />
          {/* Fallback visually hidden title for dialogs without visible DialogTitle */}
          <DialogFallbackTitle />
          {noWrapper ? (
            children
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {children}
            </div>
          )}
          <DialogPrimitive.Close
            ref={closeRef}
            className={cn(
              "absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary z-10",
              hideCloseButton && "sr-only"
            )}
          >
            <X className="size-4" />
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
