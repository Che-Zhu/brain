"use client";

import { Check, ChevronDown, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@shadcn/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@shadcn/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@shadcn/ui/popover";

type FacetedValue<Multiple extends boolean> = Multiple extends true
  ? string[]
  : string;

interface FacetedContextValue<Multiple extends boolean = boolean> {
  value?: FacetedValue<Multiple>;
  onItemSelect?: (value: string) => void;
  multiple?: Multiple;
}

const FacetedContext = React.createContext<FacetedContextValue<boolean> | null>(
  null
);

function useFacetedContext(name: string) {
  const context = React.useContext(FacetedContext);
  if (!context) {
    throw new Error(`\`${name}\` must be within Faceted`);
  }
  return context;
}

interface FacetedProps<Multiple extends boolean = false>
  extends React.ComponentProps<typeof Popover> {
  value?: FacetedValue<Multiple>;
  onValueChange?: (value: FacetedValue<Multiple> | undefined) => void;
  children?: React.ReactNode;
  multiple?: Multiple;
}

function Faceted<Multiple extends boolean = false>(
  props: FacetedProps<Multiple>
) {
  const {
    open: openProp,
    onOpenChange: onOpenChangeProp,
    value,
    onValueChange,
    children,
    multiple = false,
    ...facetedProps
  } = props;

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;

  const onOpenChange = React.useCallback(
    (newOpen: boolean, ...rest: unknown[]) => {
      if (!isControlled) {
        setUncontrolledOpen(newOpen);
      }
      (onOpenChangeProp as ((...args: unknown[]) => void) | undefined)?.(newOpen, ...rest);
    },
    [isControlled, onOpenChangeProp]
  );

  const onItemSelect = React.useCallback(
    (selectedValue: string) => {
      if (!onValueChange) {
        return;
      }

      if (multiple) {
        const currentValue = (Array.isArray(value) ? value : []) as string[];
        const newValue = currentValue.includes(selectedValue)
          ? currentValue.filter((v) => v !== selectedValue)
          : [...currentValue, selectedValue];
        onValueChange(newValue as FacetedValue<Multiple>);
      } else {
        if (value === selectedValue) {
          onValueChange(undefined);
        } else {
          onValueChange(selectedValue as FacetedValue<Multiple>);
        }

        requestAnimationFrame(() => onOpenChange(false));
      }
    },
    [multiple, value, onValueChange, onOpenChange]
  );

  const contextValue = React.useMemo<FacetedContextValue<typeof multiple>>(
    () => ({ value, onItemSelect, multiple }),
    [value, onItemSelect, multiple]
  );

  return (
    <FacetedContext.Provider value={contextValue}>
      <Popover onOpenChange={onOpenChange} open={open} {...facetedProps}>
        {children}
      </Popover>
    </FacetedContext.Provider>
  );
}

function FacetedTrigger(props: React.ComponentProps<typeof PopoverTrigger>) {
  const { className, children, ...triggerProps } = props;

  return (
    <PopoverTrigger
      {...triggerProps}
      className={cn("justify-between text-left", className)}
    >
      {children}
    </PopoverTrigger>
  );
}

interface FacetedBadgeListProps extends React.ComponentProps<"div"> {
  options?: { label: string; value: string }[];
  max?: number;
  badgeClassName?: string;
  placeholder?: string;
}

function FacetedBadgeList(props: FacetedBadgeListProps) {
  const {
    options = [],
    max = 2,
    placeholder = "Select options...",
    className,
    badgeClassName,
    ...badgeListProps
  } = props;

  const context = useFacetedContext("FacetedBadgeList");
  const values = Array.isArray(context.value)
    ? context.value
    : ([context.value].filter(Boolean) as string[]);

  const getLabel = React.useCallback(
    (value: string) => {
      const option = options.find((opt) => opt.value === value);
      return option?.label ?? value;
    },
    [options]
  );

  if (!values || values.length === 0) {
    return (
      <div
        {...badgeListProps}
        className="flex w-full items-center gap-1 text-muted-foreground"
      >
        {placeholder}
        <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
      </div>
    );
  }

  return (
    <div
      {...badgeListProps}
      className={cn("flex flex-wrap items-center gap-1", className)}
    >
      {values.length > max ? (
        <Badge
          className={cn("rounded-sm px-1 font-normal", badgeClassName)}
          variant="secondary"
        >
          {values.length} selected
        </Badge>
      ) : (
        values.map((value) => (
          <Badge
            className={cn("rounded-sm px-1 font-normal", badgeClassName)}
            key={value}
            variant="secondary"
          >
            <span className="truncate">{getLabel(value)}</span>
          </Badge>
        ))
      )}
    </div>
  );
}

function FacetedContent(props: React.ComponentProps<typeof PopoverContent>) {
  const { className, children, ...contentProps } = props;

  return (
    <PopoverContent
      {...contentProps}
      align="start"
      className={cn(
        "w-[200px] origin-(--radix-popover-content-transform-origin) p-0",
        className
      )}
    >
      <Command>{children}</Command>
    </PopoverContent>
  );
}

const FacetedInput = CommandInput;

const FacetedList = CommandList;

const FacetedEmpty = CommandEmpty;

const FacetedGroup = CommandGroup;

interface FacetedItemProps extends React.ComponentProps<typeof CommandItem> {
  value: string;
}

function FacetedItem(props: FacetedItemProps) {
  const { value, onSelect, className, children, ...itemProps } = props;
  const context = useFacetedContext("FacetedItem");

  const isSelected = context.multiple
    ? Array.isArray(context.value) && context.value.includes(value)
    : context.value === value;

  const onItemSelect = React.useCallback(
    (currentValue: string) => {
      if (onSelect) {
        onSelect(currentValue);
      } else if (context.onItemSelect) {
        context.onItemSelect(currentValue);
      }
    },
    [onSelect, context]
  );

  return (
    <CommandItem
      aria-selected={isSelected}
      className={cn("gap-2", className)}
      data-selected={isSelected}
      onSelect={() => onItemSelect(value)}
      {...itemProps}
    >
      <span
        className={cn(
          "flex size-4 items-center justify-center rounded-sm border border-primary",
          isSelected
            ? "bg-primary text-primary-foreground"
            : "opacity-50 [&_svg]:invisible"
        )}
      >
        <Check className="size-4" />
      </span>
      {children}
    </CommandItem>
  );
}

const FacetedSeparator = CommandSeparator;

interface FacetedFilterProps {
  value: string[];
  onValueChange: (v: string[]) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

function FacetedFilter({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
}: FacetedFilterProps) {
  return (
    <Faceted<true>
      multiple
      onValueChange={(v) => onValueChange(v ?? [])}
      value={value}
    >
      <FacetedTrigger className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-3 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground">
        <FacetedBadgeList max={2} placeholder={placeholder} />
      </FacetedTrigger>
      <FacetedContent>
        <FacetedInput placeholder={searchPlaceholder} />
        <FacetedList>
          <FacetedEmpty>{emptyText}</FacetedEmpty>
          <FacetedGroup>
            {options.map((opt) => (
              <FacetedItem key={opt} value={opt}>
                <span className="truncate">{opt}</span>
              </FacetedItem>
            ))}
          </FacetedGroup>
        </FacetedList>
      </FacetedContent>
    </Faceted>
  );
}

interface FacetedFilterAllProps {
  label: string;
  value: string[];
  onValueChange: (v: string[]) => void;
  options: string[];
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  showLabel?: boolean;
  icon?: React.ReactNode;
}

function FacetedFilterAll({
  label,
  value,
  onValueChange,
  options,
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  showLabel = true,
  icon,
}: FacetedFilterAllProps) {
  const isAll = value.length === 0;
  const displayText = isAll
    ? showLabel
      ? "All"
      : label
    : value.length === 1
      ? value[0]
      : `${value.length} selected`;

  return (
    <div
      className={cn(
        "flex h-8 items-center overflow-hidden rounded-md border border-input bg-background shadow-xs",
        className
      )}
    >
      {showLabel && (
        <>
          <span className="flex items-center px-3 text-muted-foreground text-sm">
            {label}
          </span>
          <div className="h-full w-px bg-border" />
        </>
      )}
      <Faceted<true>
        multiple
        onValueChange={(v) => {
          const next = v ?? [];
          if (next.length === options.length) {
            onValueChange([]);
          } else {
            onValueChange(next);
          }
        }}
        value={value}
      >
        <FacetedTrigger className="flex h-full flex-1 items-center gap-1.5 px-2 text-sm hover:bg-accent hover:text-accent-foreground">
          {icon && (
            <span className="shrink-0 text-muted-foreground [&>svg]:size-4">
              {icon}
            </span>
          )}
          <span
            className={cn(
              "flex-1 truncate text-left",
              isAll && "text-muted-foreground"
            )}
          >
            {displayText}
          </span>
          <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-50" />
        </FacetedTrigger>
        <FacetedContent className="min-w-[var(--anchor-width)]">
          <FacetedInput placeholder={searchPlaceholder} />
          <FacetedList>
            <FacetedEmpty>{emptyText}</FacetedEmpty>
            <FacetedGroup>
              <CommandItem className="gap-2" onSelect={() => onValueChange([])}>
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-sm border border-primary",
                    isAll
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50 [&_svg]:invisible"
                  )}
                >
                  <Check className="size-4" />
                </span>
                <span>All</span>
              </CommandItem>
              <CommandSeparator />
              {options.map((opt) => (
                <FacetedItem key={opt} value={opt}>
                  <span className="truncate">{opt}</span>
                </FacetedItem>
              ))}
            </FacetedGroup>
          </FacetedList>
        </FacetedContent>
      </Faceted>
    </div>
  );
}

export {
  Faceted,
  FacetedBadgeList,
  FacetedContent,
  FacetedEmpty,
  FacetedFilter,
  FacetedFilterAll,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedList,
  FacetedSeparator,
  FacetedTrigger,
};
