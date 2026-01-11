"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// Hook for swipe-to-dismiss on bottom sheets
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
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    style={style}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b p-6 data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 max-h-[96vh] rounded-t-2xl border border-b-0 pt-2 px-6 pb-6 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r p-6 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l p-6 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
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

  const { dragY, isDragging, handlers } = useSwipeToDismiss(handleDismiss, isBottomSheet)

  return (
    <SheetPortal>
      <SheetOverlay style={isDragging ? { opacity: Math.max(0.2, 1 - dragY / 300) } : undefined} />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        style={
          isBottomSheet && dragY > 0
            ? {
                transform: `translateY(${dragY}px)`,
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }
            : undefined
        }
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
