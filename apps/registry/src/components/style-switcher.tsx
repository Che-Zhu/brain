"use client";

import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  registryStyleBrandUrl,
  useRegistryStyle,
} from "@/context/registry-style-context";
import { cn } from "@/lib/utils";

/** Same frame in the sidebar trigger and in each dropdown row: bordered tile + 16px glyph */
function StyleBrandIcon({
  style,
  className,
}: {
  style: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = registryStyleBrandUrl(style);

  const frame = cn(
    "flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background",
    className
  );

  if (failed) {
    return (
      <div
        className={cn(
          frame,
          "bg-muted font-medium text-[10px] text-muted-foreground uppercase"
        )}
      >
        {style.slice(0, 1)}
      </div>
    );
  }

  return (
    <div className={frame}>
      {/* eslint-disable-next-line @next/next/no-img-element -- public brand assets per style */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: letter fallback on load error */}
      <img
        alt=""
        className="size-4 object-contain"
        height={16}
        onError={() => {
          setFailed(true);
        }}
        src={src}
        width={16}
      />
    </div>
  );
}

/**
 * Registry style switcher for the sidebar header. Icon loads
 * `public/registry/{style}/brand.jpg`.
 */
export function StyleSwitcher({ className }: { className?: string }) {
  const { isMobile } = useSidebar();
  const { styles, selectedStyle, setSelectedStyle } = useRegistryStyle();

  if (styles.length === 0) {
    return null;
  }

  const active = selectedStyle || styles[0];

  return (
    <SidebarMenu className={cn(className)}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
                size="lg"
              />
            }
          >
            <StyleBrandIcon key={active} style={active} />
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium capitalize">{active}</span>
              <span className="truncate text-sidebar-foreground/60 text-xs">
                Registry style
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Style
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                onValueChange={setSelectedStyle}
                value={active}
              >
                {styles.map((style) => (
                  <DropdownMenuRadioItem
                    className="gap-2 py-2 pr-8 pl-2"
                    key={style}
                    value={style}
                  >
                    <StyleBrandIcon key={style} style={style} />
                    <span className="capitalize">{style}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
