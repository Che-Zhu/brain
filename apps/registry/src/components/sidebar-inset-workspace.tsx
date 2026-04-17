"use client";

import { ChevronsUpDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { type ReactNode, useMemo } from "react";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { useRegistryPreviewVariant } from "@/hooks/use-registry-preview-variant";
import { parseRegistryPathname } from "@/lib/parse-registry-pathname";

export function SidebarInsetWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const registryRoute = parseRegistryPathname(pathname);
  const previewKey = registryRoute
    ? `${registryRoute.style}/${registryRoute.group}/${registryRoute.name}`
    : null;
  const { options, showVariantSwitcher, effectiveVariantId, setVariantId } =
    useRegistryPreviewVariant(previewKey);

  const variantMenuOrder = useMemo(() => [...options].reverse(), [options]);
  const activeVariantLabel =
    options.find((o) => o.id === effectiveVariantId)?.title ?? "Variant";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {showVariantSwitcher ? (
        <header
          className="flex shrink-0 items-center gap-1 border-border border-b bg-background p-1 px-2"
          data-slot="sidebar-inset-workspace-header"
        >
          <SidebarTrigger className="shrink-0 md:hidden" />
          <div className="mr-1 border-border border-r pr-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="h-6 gap-1 px-2 font-mono text-xs"
                render={
                  <Button
                    className="hover:brightness-120"
                    size="xs"
                    variant="ghost"
                  />
                }
              >
                <span className="max-w-24 truncate">{activeVariantLabel}</span>
                <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-36"
                side="bottom"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs">
                    Variant
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    onValueChange={(id) => {
                      Promise.resolve(setVariantId(id)).catch(() => undefined);
                    }}
                    value={effectiveVariantId ?? ""}
                  >
                    {variantMenuOrder.map((opt) => (
                      <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                        {opt.title}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
      ) : null}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
