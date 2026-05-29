import { Input, type InputProps } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";

function PaneInput({ className, ...props }: InputProps) {
  return (
    <Input
      className={cn(
        "h-9 border-input bg-transparent text-foreground text-sm placeholder:text-muted-foreground dark:bg-transparent",
        "focus-visible:border-blue-400 focus-visible:ring-[1px] focus-visible:ring-blue-400/50",
        className
      )}
      {...props}
    />
  );
}

export { PaneInput };
