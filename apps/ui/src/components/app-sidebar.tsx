"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppSidebar() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  const projectsHref = "/project";
  const projectsActive =
    pathname === "/project" || pathname.startsWith("/project/");

  return (
    <div className="[--sidebar-width:14rem]">
      <Sidebar collapsible="icon">
        <SidebarContent className="bg-background pt-2">
          <SidebarGroup className="pt-0">
            <SidebarGroupContent className="min-w-0">
              <SidebarMenu className="min-w-0">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className={cn(
                      "hoverable shrink-0 cursor-pointer gap-2 rounded-xl text-xs leading-none"
                    )}
                    isActive={projectsActive}
                    render={
                      <Link
                        aria-label="Projects"
                        className="flex min-h-0 min-w-0 flex-1 items-center gap-2 overflow-hidden group-data-[collapsible=icon]:justify-center"
                        href={projectsHref}
                      >
                        <LayoutGrid
                          aria-hidden
                          className="size-4 shrink-0"
                          strokeWidth={2}
                        />
                        <span className="min-w-0 flex-1 truncate group-data-[collapsible=icon]:hidden">
                          Projects
                        </span>
                      </Link>
                    }
                    tooltip={{
                      delay: 400,
                      children: "Projects",
                      hidden: isMobile,
                      className:
                        "rounded-xl border border-sidebar-border bg-background-selected text-xs text-foreground shadow-md",
                    }}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </div>
  );
}
