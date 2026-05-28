import { Checkbox } from "@data-browser/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@data-browser/components/ui/popover";
import { cn } from "@data-browser/lib/utils";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface MultiSelectProps {
  className?: string;
  disabled?: boolean;
  onChange: (selected: string[]) => void;
  options: string[];
  placeholder?: string;
  selected: string[];
}

/** Multi-select dropdown using Popover + Checkbox list. */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "flex h-8 w-full cursor-pointer items-center justify-between gap-2 whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
            disabled && "pointer-events-none opacity-50",
            className
          )}
          type="button"
        >
          <span className="truncate">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.join(", ")
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-2"
      >
        {options.length === 0 ? (
          <div className="p-2 text-center text-muted-foreground text-sm">
            No options available
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <label
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                key={opt}
              >
                <Checkbox
                  checked={selected.includes(opt)}
                  className="h-3.5 w-3.5"
                  onCheckedChange={() => toggle(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
