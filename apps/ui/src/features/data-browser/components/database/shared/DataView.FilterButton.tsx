import { Button } from "@data-browser/components/ui/Button";
import { useI18n } from "@data-browser/i18n/useI18n";
import { Filter } from "lucide-react";

/** Filter button with optional active count badge. */
export function DataViewFilterButton({
  onClick,
  count,
}: {
  onClick: () => void;
  count?: number;
}) {
  const { t } = useI18n();

  return (
    <Button
      className="min-w-[86px] gap-2.5 rounded-lg"
      data-qa-action="open"
      data-qa-module="data-view"
      data-qa-object="filter"
      data-qa-state={count ? "active" : "inactive"}
      data-testid="data-view.filter-button"
      onClick={onClick}
    >
      <Filter className="h-4 w-4" />
      {t("common.actions.filter")}
      {count ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-foreground px-1 font-bold text-[10px] text-primary">
          {count}
        </span>
      ) : null}
    </Button>
  );
}
