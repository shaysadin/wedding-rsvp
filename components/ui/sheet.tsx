"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Hook for swipe-to-dismiss on bottom sheets
// Uses direct DOM manipulation for smooth 60fps performance
function useSwipeToDismiss(onDismiss: () => void, enabled: boolean = true) {
  const contentRef = React.useRef<HTMLElement | null>(null)
  const overlayRef = React.useRef<HTMLElement | null>(null)
  const startY = React.useRef(0)
  const isDragging = React.useRef(false)

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    if (!enabled) return
    const touch = e.touches[0]
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const touchY = touch.clientY - rect.top

    if (touchY <= 60) {
      startY.current = touch.clientY
      isDragging.current = true
      contentRef.current = target
      overlayRef.current = target.previousElementSibling as HTMLElement
      target.style.transition = 'none'
    }
  }, [enabled])

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !enabled || !contentRef.current) return
    const touch = e.touches[0]
    const delta = Math.max(0, touch.clientY - startY.current)

    contentRef.current.style.transform = `translateY(${delta}px)`
    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(Math.max(0.2, 1 - delta / 300))
    }
  }, [enabled])

  const handleTouchEnd = React.useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !enabled || !contentRef.current) return

    const touch = e.changedTouches[0]
    const delta = touch.clientY - startY.current

    contentRef.current.style.transition = 'transform 0.2s ease-out'

    if (delta > 100) {
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

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay> & { style?: React.CSSProperties }
>(({ className, style, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "dialog-overlay fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
      className
    )}
    style={style}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background shadow-lg",
  {
    variants: {
      side: {
        top: "sheet-content-top inset-x-0 top-0 border-b p-6",
        bottom: "sheet-content-bottom inset-x-0 bottom-0 max-h-[96vh] rounded-t-2xl border border-b-0 pt-2 px-6 pb-6",
        left: "sheet-content-left inset-y-0 left-0 h-full w-3/4 border-r p-6 sm:max-w-sm",
        right: "sheet-content-right inset-y-0 right-0 h-full w-3/4 border-l p-6 sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
  VariantProps<typeof sheetVariants> { }

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const isBottomSheet = side === "bottom"

  const handleDismiss = React.useCallback(() => {
    closeRef.current?.click()
  }, [])

  const { handlers } = useSwipeToDismiss(handleDismiss, isBottomSheet)

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...(isBottomSheet ? handlers : {})}
        {...props}
      >
        {/* Drag handle for bottom sheet */}
        {isBottomSheet && (
          <div className="mx-auto mb-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/40 cursor-grab active:cursor-grabbing" />
        )}
        {children}
        <SheetPrimitive.Close
          ref={closeRef}
          className="absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
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
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
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
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
