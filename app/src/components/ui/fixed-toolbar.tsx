"use client";

import { cn } from "@/utils/cn";

import { Toolbar } from "./toolbar";

export function FixedToolbar(props: React.ComponentProps<typeof Toolbar>) {
  return (
    <Toolbar
      {...props}
      className={cn(
        "scrollbar-hide border-b-border bg-background/95 supports-backdrop-blur:bg-background/60 sticky left-0 top-0 z-50 flex w-full justify-between overflow-x-auto rounded-t-lg border-b p-1 backdrop-blur-lg",
        props.className,
      )}
    />
  );
}
