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
  const [coords, setCoords] = React.useState({ x: 0, y: 0 });

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setCoords({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        hideWhenDetached
        className={cn(
          "bg-primary/75 border-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 pointer-events-none fixed z-50 w-max text-balance rounded-md border px-3 py-1.5 text-xs",
          className,
        )}
        style={{
          ...props.style,
          left: coords.x + sideOffset,
          top: coords.y + sideOffset,
        }}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
