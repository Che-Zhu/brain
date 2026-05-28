import { Button } from "@data-browser/components/ui/Button";
import { Input } from "@data-browser/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@data-browser/components/ui/select";
import { useI18n } from "@data-browser/i18n/useI18n";
import { cn } from "@data-browser/lib/utils";
import { Plus, X } from "lucide-react";
import { useEditTable } from "./EditTableProvider";

const FK_ACTIONS = [
  "RESTRICT",
  "CASCADE",
  "SET NULL",
  "NO ACTION",
  "SET DEFAULT",
];

/**
 * Foreign keys tab for EditTableModal — batch editing with inline deletion marking.
 * Renders a table of foreign keys with name, column, ref table, ref column, on delete, on update, and a hover delete button.
 * Consumes `useEditTable()` for all state and actions.
 */
export function EditTableForeignKeysTab() {
  const { t } = useI18n();
  const { state, actions } = useEditTable();
  const { foreignKeys, columnNames, isExecuting } = state;
  const { addForeignKey, updateForeignKey, toggleForeignKeyDeletion } = actions;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end">
        <Button
          className="gap-1 text-primary"
          onClick={addForeignKey}
          size="sm"
          variant="link"
        >
          <Plus className="h-3 w-3" />
          {t("sql.editTable.foreignKeys.add")}
        </Button>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left font-medium">
                {t("sql.editTable.foreignKeys.name")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("sql.editTable.foreignKeys.column")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("sql.editTable.foreignKeys.refTable")}
              </th>
              <th className="px-3 py-2 text-left font-medium">
                {t("sql.editTable.foreignKeys.refColumn")}
              </th>
              <th className="w-24 px-3 py-2 text-left font-medium">
                {t("sql.editTable.foreignKeys.onDelete")}
              </th>
              <th className="w-24 px-3 py-2 text-left font-medium">
                {t("sql.editTable.foreignKeys.onUpdate")}
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {foreignKeys.length === 0 ? (
              <tr>
                <td
                  className="p-8 text-center text-muted-foreground"
                  colSpan={7}
                >
                  {t("sql.editTable.foreignKeys.empty")}
                </td>
              </tr>
            ) : (
              foreignKeys.map((fk) => (
                <tr
                  className={cn(
                    "group relative hover:bg-muted/30",
                    fk.isNew && !fk.isMarkedForDeletion && "bg-primary/5",
                    fk.isMarkedForDeletion && "bg-destructive/5 opacity-60"
                  )}
                  key={fk.id}
                >
                  <td className="p-2">
                    <Input
                      className={cn(
                        "h-auto border-transparent bg-transparent px-2 py-1 shadow-none focus-visible:border-primary focus-visible:bg-background focus-visible:ring-0",
                        fk.isMarkedForDeletion &&
                          "text-muted-foreground line-through"
                      )}
                      disabled={isExecuting || fk.isMarkedForDeletion}
                      onChange={(e) =>
                        updateForeignKey(fk.id, "name", e.target.value)
                      }
                      placeholder={t(
                        "sql.editTable.foreignKeys.namePlaceholder"
                      )}
                      value={fk.name}
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      disabled={isExecuting || fk.isMarkedForDeletion}
                      onValueChange={(v) =>
                        updateForeignKey(fk.id, "column", v)
                      }
                      value={fk.column}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full bg-transparent text-sm",
                          fk.isMarkedForDeletion &&
                            "text-muted-foreground line-through"
                        )}
                        size="sm"
                      >
                        <SelectValue
                          placeholder={t(
                            "sql.editTable.foreignKeys.columnPlaceholder"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {columnNames.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input
                      className={cn(
                        "h-auto border-transparent bg-transparent px-2 py-1 shadow-none focus-visible:border-primary focus-visible:bg-background focus-visible:ring-0",
                        fk.isMarkedForDeletion &&
                          "text-muted-foreground line-through"
                      )}
                      disabled={isExecuting || fk.isMarkedForDeletion}
                      onChange={(e) =>
                        updateForeignKey(
                          fk.id,
                          "referencedTable",
                          e.target.value
                        )
                      }
                      placeholder={t(
                        "sql.editTable.foreignKeys.refTablePlaceholder"
                      )}
                      value={fk.referencedTable}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      className={cn(
                        "h-auto border-transparent bg-transparent px-2 py-1 shadow-none focus-visible:border-primary focus-visible:bg-background focus-visible:ring-0",
                        fk.isMarkedForDeletion &&
                          "text-muted-foreground line-through"
                      )}
                      disabled={isExecuting || fk.isMarkedForDeletion}
                      onChange={(e) =>
                        updateForeignKey(
                          fk.id,
                          "referencedColumn",
                          e.target.value
                        )
                      }
                      placeholder={t(
                        "sql.editTable.foreignKeys.refColumnPlaceholder"
                      )}
                      value={fk.referencedColumn}
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      disabled={isExecuting || fk.isMarkedForDeletion}
                      onValueChange={(v) =>
                        updateForeignKey(fk.id, "onDelete", v)
                      }
                      value={fk.onDelete}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full bg-transparent text-sm",
                          fk.isMarkedForDeletion &&
                            "text-muted-foreground line-through"
                        )}
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FK_ACTIONS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2">
                    <Select
                      disabled={isExecuting || fk.isMarkedForDeletion}
                      onValueChange={(v) =>
                        updateForeignKey(fk.id, "onUpdate", v)
                      }
                      value={fk.onUpdate}
                    >
                      <SelectTrigger
                        className={cn(
                          "w-full bg-transparent text-sm",
                          fk.isMarkedForDeletion &&
                            "text-muted-foreground line-through"
                        )}
                        size="sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FK_ACTIONS.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-1">
                    <Button
                      className={cn(
                        "opacity-0 transition-opacity group-hover:opacity-100",
                        fk.isMarkedForDeletion
                          ? "text-destructive opacity-100 hover:bg-destructive/5 hover:text-destructive/80"
                          : "text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                      )}
                      disabled={isExecuting}
                      onClick={() => toggleForeignKeyDeletion(fk)}
                      size="sm"
                      variant="ghost"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
