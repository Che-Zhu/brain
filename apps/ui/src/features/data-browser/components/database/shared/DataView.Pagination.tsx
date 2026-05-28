import { Button } from "@data-browser/components/ui/Button";
import { Input } from "@data-browser/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@data-browser/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@data-browser/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { PaginationProps } from "./types";

/** Shared pagination controls for detail views. */
export function DataViewPagination({
  currentPage,
  totalPages,
  pageSize,
  total,
  loading,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, total);
  const label = itemLabel ? ` ${itemLabel}` : "";
  const safeTotalPages = totalPages || 1;

  return (
    <div className="flex items-center justify-between border-border/50 border-t bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {`${startRow}-${endRow} of ${total}${label}`}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-muted-foreground text-sm">
            {"Rows per page"}
          </span>
          <Select
            onValueChange={(v) => onPageSizeChange(Number(v))}
            value={String(pageSize)}
          >
            <SelectTrigger
              className="w-auto gap-1 border-border/50 bg-transparent"
              size="sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  className="h-7 w-7"
                  disabled={currentPage === 1 || loading}
                  onClick={() => onPageChange(1)}
                  size="icon"
                  variant="outline"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{"First page"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  className="h-7 w-7"
                  disabled={currentPage === 1 || loading}
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  size="icon"
                  variant="outline"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{"Previous page"}</TooltipContent>
          </Tooltip>
          <div className="mx-2 flex items-center gap-1">
            <span className="text-muted-foreground text-sm">{"Page"}</span>
            <Input
              className="h-7 w-12 px-1 text-center"
              max={safeTotalPages}
              min={1}
              onChange={(e) => {
                const val = Number.parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) {
                  onPageChange(Math.min(val, safeTotalPages));
                }
              }}
              type="number"
              value={currentPage}
            />
            <span className="text-muted-foreground text-sm">
              {"of"} {safeTotalPages}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  className="h-7 w-7"
                  disabled={currentPage >= safeTotalPages || loading}
                  onClick={() =>
                    onPageChange(Math.min(safeTotalPages, currentPage + 1))
                  }
                  size="icon"
                  variant="outline"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{"Next page"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  className="h-7 w-7"
                  disabled={currentPage >= safeTotalPages || loading}
                  onClick={() => onPageChange(safeTotalPages)}
                  size="icon"
                  variant="outline"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{"Last page"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
