"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@workspace/ui/lib/utils";
import * as React from "react";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    className={cn(
      "inline-flex h-auto w-full items-center justify-start gap-0 rounded-none border-border border-b bg-transparent p-0 text-muted-foreground",
      className
    )}
    ref={ref}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    className={cn(
      "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-none px-3 py-2 font-medium text-sm outline-offset-2 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-primary",
      className
    )}
    ref={ref}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    className={cn(
      "mt-0 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70",
      className
    )}
    ref={ref}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
