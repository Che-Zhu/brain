import { Button } from "@data-browser/components/ui/Button";
import { Dialog, DialogContent } from "@data-browser/components/ui/dialog";
import { Input } from "@data-browser/components/ui/Input";
import { ModalForm, useModalForm } from "@data-browser/components/ui/ModalForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@data-browser/components/ui/select";
import { useI18n } from "@data-browser/i18n/useI18n";
import { Plus, Trash2 } from "lucide-react";
import {
  FilterCollectionProvider,
  useFilterCollectionCtx,
} from "./FilterCollectionProvider";
import type {
  FlatMongoFilter,
  MongoFilterOperator,
} from "./filter-collection.types";

interface FilterCollectionModalProps {
  fields: string[];
  initialFilter?: FlatMongoFilter;
  onApply: (filter: FlatMongoFilter) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function getOperatorOptions(
  t: ReturnType<typeof useI18n>["t"]
): Array<{ value: MongoFilterOperator; label: string }> {
  return [
    { value: "$eq", label: t("mongodb.filter.operator.eq") },
    { value: "$ne", label: t("mongodb.filter.operator.ne") },
    { value: "$regex", label: t("mongodb.filter.operator.regex") },
    { value: "$gt", label: t("mongodb.filter.operator.gt") },
    { value: "$lt", label: t("mongodb.filter.operator.lt") },
    { value: "$gte", label: t("mongodb.filter.operator.gte") },
    { value: "$lte", label: t("mongodb.filter.operator.lte") },
    { value: "$in", label: t("mongodb.filter.operator.in") },
  ];
}

/** Modal for building flat MongoDB collection filters. */
export function FilterCollectionModal({
  open,
  onOpenChange,
  onApply,
  fields,
  initialFilter,
}: FilterCollectionModalProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="flex max-h-[85vh] max-w-2xl flex-col"
        showCloseButton={false}
      >
        <FilterCollectionProvider
          fields={fields}
          initialFilter={initialFilter}
          onApply={onApply}
          onOpenChange={onOpenChange}
          open={open}
        >
          <ModalForm.Header />
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            <FilterConditionList />
            <FilterModalAlert />
          </div>
          <FilterCollectionFooter />
        </FilterCollectionProvider>
      </DialogContent>
    </Dialog>
  );
}

function FilterConditionList() {
  const { t } = useI18n();
  const { conditions, fields, addCondition, removeCondition, updateCondition } =
    useFilterCollectionCtx();
  const { state } = useModalForm();
  const operatorOptions = getOperatorOptions(t);
  const usedFields = new Set(
    conditions.map((condition) => condition.field.trim()).filter(Boolean)
  );
  const canAddCondition = fields.some((field) => !usedFields.has(field));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-foreground text-sm">
          {t("mongodb.filter.conditions")}
        </h3>
        <Button
          className="h-9 gap-2"
          disabled={state.isSubmitting || !canAddCondition}
          onClick={addCondition}
          size="sm"
          type="button"
        >
          <Plus className="h-4 w-4" />
          {t("mongodb.filter.addCondition")}
        </Button>
      </div>

      {conditions.length > 0 && (
        <div className="flex flex-col gap-2">
          {conditions.map((condition) => {
            const fieldOptions = fields.filter(
              (field) => field === condition.field || !usedFields.has(field)
            );

            return (
              <div className="flex items-center gap-2" key={condition.id}>
                <Select
                  disabled={state.isSubmitting}
                  onValueChange={(value) =>
                    updateCondition(condition.id, { field: value })
                  }
                  value={condition.field}
                >
                  <SelectTrigger className="h-9 min-w-50">
                    <SelectValue
                      placeholder={t("mongodb.filter.selectField")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldOptions.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  disabled={state.isSubmitting}
                  onValueChange={(value) =>
                    updateCondition(condition.id, {
                      operator: value as MongoFilterOperator,
                    })
                  }
                  value={condition.operator}
                >
                  <SelectTrigger className="h-9 w-20 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operatorOptions.map((operator) => (
                      <SelectItem key={operator.value} value={operator.value}>
                        {operator.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  className="h-9 flex-1"
                  disabled={state.isSubmitting}
                  onChange={(event) =>
                    updateCondition(condition.id, { value: event.target.value })
                  }
                  placeholder={
                    condition.operator === "$in"
                      ? t("mongodb.filter.valueInPlaceholder")
                      : t("mongodb.filter.valuePlaceholder")
                  }
                  value={condition.value}
                />

                <Button
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={state.isSubmitting}
                  onClick={() => removeCondition(condition.id)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterModalAlert() {
  const { state } = useModalForm();
  if (!state.alert) {
    return null;
  }
  return <ModalForm.Alert />;
}

function FilterCollectionFooter() {
  const { t } = useI18n();
  const { state, actions } = useModalForm();

  return (
    <ModalForm.Footer>
      <ModalForm.CancelButton />
      <Button
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={state.isSubmitting}
        onClick={actions.submit}
        type="button"
      >
        {t("mongodb.filter.apply")}
      </Button>
    </ModalForm.Footer>
  );
}
