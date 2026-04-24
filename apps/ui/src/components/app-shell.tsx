"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import AppSidebar from "@/components/app-sidebar";

/**
 * Composable app chrome. Use **named exports** from this file in Server Components
 * (e.g. `AppShellChrome`); object access like `AppShell.Chrome` can be undefined on
 * the RSC → client boundary — see `AppShell` namespace for client-only usage.
 */
export function AppShellChrome({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider
      className="h-svh max-h-svh min-h-0 overflow-hidden"
      defaultOpen={false}
    >
      {children}
    </SidebarProvider>
  );
}

export const AppShellSidebar = AppSidebar;

export function AppShellView({
  children,
  className,
  ...rest
}: ComponentProps<typeof SidebarInset>) {
  return (
    <SidebarInset
      className={cn("min-h-0 min-w-0 overflow-hidden", className)}
      {...rest}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative z-20 flex shrink-0 items-center gap-2 border-border border-b bg-background px-2 py-1.5 md:hidden">
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {children}
        </div>
      </div>
    </SidebarInset>
  );
}

/**
 * Main column without the sidebar: full viewport, scrolls like {@link AppShellView} but no inset / trigger.
 */
export function AppShellSolo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-svh max-h-svh min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
        className
      )}
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-auto">
        {children}
      </div>
    </div>
  );
}

/** Client-only convenience namespace; prefer named exports from server layouts. */
export const AppShell = {
  Chrome: AppShellChrome,
  Sidebar: AppShellSidebar,
  View: AppShellView,
  Solo: AppShellSolo,
} as const;
