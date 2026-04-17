"use client";

import type { RegistrySidebarSection } from "@registry/nav-types";
import { usePathname } from "next/navigation";
import AppSidebar from "@/components/app-sidebar";
import { SidebarInsetWorkspace } from "@/components/sidebar-inset-workspace";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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
