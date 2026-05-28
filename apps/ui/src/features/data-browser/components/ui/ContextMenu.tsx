import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

export type ContextMenuItem =
  | { separator: true }
  | {
      separator?: false;
      label: string;
      icon?: React.ReactNode;
      onClick: () => void;
      danger?: boolean;
    };

interface ContextMenuProps {
  align?: "start" | "end";
  items: ContextMenuItem[];
  onClose: () => void;
  side?: "top" | "right" | "bottom" | "left";
  x: number;
  y: number;
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
  side = "bottom",
  align = "start",
}: ContextMenuProps) {
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={true}
    >
      <DropdownMenuTrigger asChild>
        <span
          style={{ position: "fixed", top: y, left: x, width: 0, height: 0 }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-[180px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
        side={side}
        sideOffset={0}
      >
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {item.separator ? (
              <DropdownMenuSeparator />
            ) : (
              <DropdownMenuItem
                onSelect={item.onClick}
                variant={item.danger ? "destructive" : "default"}
              >
                {item.icon}
                {item.label}
              </DropdownMenuItem>
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
