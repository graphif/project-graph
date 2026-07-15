import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/utils/cn";

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorVariant?: "default" | "caution" | "destructive";
};

function Progress({ className, value, indicatorVariant = "default", ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn("bg-primary/20 relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all",
          indicatorVariant === "destructive"
            ? "bg-destructive"
            : indicatorVariant === "caution"
              ? "bg-chart-4"
              : "bg-primary",
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
