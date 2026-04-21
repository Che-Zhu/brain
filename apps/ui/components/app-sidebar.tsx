"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@workspace/ui/components/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useAtomValue } from "jotai";
import { Boxes, FolderKanban } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { devNamespaceAtom } from "@/atom/auth-atom";

export default function AppSidebar() {
  const pathname = usePathname();
  const { isMobile } = useSidebar();
  const namespace = useAtomValue(devNamespaceAtom).trim();
  const namespaceDisplay = namespace === "" ? "—" : namespace;

  const projectsHref = "/";
  const projectsActive =
    pathname === "/" || pathname === "" || pathname.startsWith("/project");

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
                        <FolderKanban
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
        <SidebarFooter className="mt-auto border-sidebar-border border-t bg-background">
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              Namespace
            </div>
            <div
              className="truncate font-mono text-[11px] text-sidebar-foreground"
              title={namespace === "" ? undefined : namespace}
            >
              {namespaceDisplay}
            </div>
          </div>
          <div className="hidden justify-center group-data-[collapsible=icon]:flex">
            <Tooltip>
              <TooltipTrigger
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2"
                type="button"
              >
                <Boxes
                  aria-hidden
                  className="size-4 shrink-0"
                  strokeWidth={2}
                />
                <span className="sr-only">Namespace: {namespaceDisplay}</span>
              </TooltipTrigger>
              <TooltipContent
                className="max-w-xs text-left"
                hidden={isMobile}
                side="right"
              >
                <div className="font-medium text-[10px] uppercase tracking-wide">
                  Namespace
                </div>
                <div className="break-all font-mono text-[11px] text-background">
                  {namespaceDisplay}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </div>
  );
}
