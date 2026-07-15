"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/utils/cn";

function TooltipProvider({ delayDuration = 0, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" asChild {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 24,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [offset, setOffset] = React.useState({ left: 0, top: 0 });

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = event.clientX;
      const y = event.clientY;

      if (contentRef.current) {
        const { width, height } = contentRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = x + sideOffset;
        let top = y + sideOffset;

        if (left + width > viewportWidth) {
          left = x - width - sideOffset;
        }

        if (top + height > viewportHeight) {
          top = y - height - sideOffset;
        }

        // Final boundary checks
        left = Math.max(0, Math.min(left, viewportWidth - width));
        top = Math.max(0, Math.min(top, viewportHeight - height));

        setOffset({ left, top });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [sideOffset]);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={contentRef}
        data-slot="tooltip-content"
        hideWhenDetached
        className={cn(
          "bg-primary/75 border-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 pointer-events-none fixed z-50 w-max rounded-md border px-3 py-1.5 text-xs text-balance",
          className,
        )}
        style={{
          ...props.style,
          left: offset.left,
          top: offset.top,
        }}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
