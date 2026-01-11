"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// Hook for swipe-to-dismiss on mobile bottom sheets
function useSwipeToDismiss(onDismiss: () => void, enabled: boolean = true) {
  const [dragY, setDragY] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const startY = React.useRef(0)
  const currentY = React.useRef(0)

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (!enabled) return
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

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> & { style?: React.CSSProperties }
>(({ className, style, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    style={style}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, children, dir, ...props }, ref) => {
  const [autoDir, setAutoDir] = React.useState<"ltr" | "rtl" | undefined>(undefined)
  const [isMobile, setIsMobile] = React.useState(false)
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (!dir) {
      const htmlDir = document.documentElement.dir as "ltr" | "rtl"
      if (htmlDir === "rtl" || htmlDir === "ltr") {
        setAutoDir(htmlDir)
      }
    }
  }, [dir])

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleDismiss = React.useCallback(() => {
    cancelRef.current?.click()
  }, [])

  const { dragY, isDragging, handlers } = useSwipeToDismiss(handleDismiss, isMobile)

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay style={isDragging ? { opacity: Math.max(0.2, 1 - dragY / 300) } : undefined} />
      <AlertDialogPrimitive.Content
        ref={ref}
        dir={dir || autoDir}
        className={cn(
          // Base styles
          "fixed z-[61] grid w-full gap-4 border bg-background shadow-lg duration-200",
          // Mobile: bottom sheet style
          "inset-x-0 bottom-0 top-auto max-h-[96vh] rounded-t-2xl border-b-0 p-4 pt-2",
          // Desktop: centered modal
          "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:p-6",
          // Animations - mobile slide up, desktop zoom
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:slide-out-to-bottom-[100%] data-[state=open]:slide-in-from-bottom-[100%]",
          "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          className
        )}
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
        <div className="mx-auto mb-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/40 sm:hidden cursor-grab active:cursor-grabbing" />
        {children}
        {/* Hidden cancel button for swipe dismiss - will be found by searching children */}
        <AlertDialogPrimitive.Cancel ref={cancelRef} className="sr-only">
          Cancel
        </AlertDialogPrimitive.Cancel>
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
})
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-start",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
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
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
