"use client";

import type { RegistrySidebarSection } from "@registry/nav-types";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
import { SidebarInsetWorkspace } from "@/components/sidebar-inset-workspace";
import { RegistryStyleProvider } from "@/context/registry-style-context";

export function AppShell({
  children,
  registrySections = [],
}: {
  children: React.ReactNode;
  registrySections?: RegistrySidebarSection[];
}) {
  const pathname = usePathname();
  const isRootPath = pathname === "/" || pathname === "";

  return (
    <SidebarProvider className="h-svh max-h-svh min-h-0 overflow-hidden">
      <RegistryStyleProvider sections={registrySections}>
        <AppSidebar registrySections={registrySections} />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          {isRootPath ? (
            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div className="relative z-20 flex shrink-0 items-center gap-2 border-border border-b bg-background px-2 py-1.5 md:hidden">
                <SidebarTrigger className="-ml-1" />
              </div>
              {children}
            </div>
          ) : (
            <SidebarInsetWorkspace>{children}</SidebarInsetWorkspace>
          )}
        </SidebarInset>
      </RegistryStyleProvider>
    </SidebarProvider>
  );
}
