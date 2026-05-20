"use client";

import {
  Content as TabsPrimitiveContent,
  List as TabsPrimitiveList,
  Root as TabsPrimitiveRoot,
  Trigger as TabsPrimitiveTrigger,
} from "@radix-ui/react-tabs";
import { cn } from "@workspace/ui/lib/utils";
import {
  type ComponentPropsWithoutRef,
  type ElementRef,
  forwardRef,
} from "react";

const Tabs = TabsPrimitiveRoot;

const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitiveList>,
  ComponentPropsWithoutRef<typeof TabsPrimitiveList>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveList
    className={cn(
      "inline-flex h-auto w-full items-center justify-start gap-0 rounded-none border-border border-b bg-transparent p-0 text-muted-foreground",
      className
    )}
    ref={ref}
    {...props}
  />
));
TabsList.displayName = TabsPrimitiveList.displayName;

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitiveTrigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitiveTrigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveTrigger
    className={cn(
      "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-none px-3 py-2 font-medium text-sm outline-offset-2 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-primary",
      className
    )}
    ref={ref}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitiveTrigger.displayName;

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitiveContent>,
  ComponentPropsWithoutRef<typeof TabsPrimitiveContent>
>(({ className, ...props }, ref) => (
  <TabsPrimitiveContent
    className={cn(
      "mt-0 outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70",
      className
    )}
    ref={ref}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitiveContent.displayName;

export { Tabs, TabsContent, TabsList, TabsTrigger };
