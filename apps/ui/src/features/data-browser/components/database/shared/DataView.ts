import { DataViewError } from "./DataView.Error";
import { DataViewFilterBar } from "./DataView.FilterBar";
import { DataViewFilterButton } from "./DataView.FilterButton";
import { DataViewLoading } from "./DataView.Loading";
import { DataViewPagination } from "./DataView.Pagination";

export const DataView = {
  FilterButton: DataViewFilterButton,
  Pagination: DataViewPagination,
  FilterBar: DataViewFilterBar,
  Loading: DataViewLoading,
  Error: DataViewError,
};
