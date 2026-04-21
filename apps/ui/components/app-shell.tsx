"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import AppSidebar from "@/components/app-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh max-h-svh min-h-0 overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative z-20 flex shrink-0 items-center gap-2 border-border border-b bg-background px-2 py-1.5 md:hidden">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
