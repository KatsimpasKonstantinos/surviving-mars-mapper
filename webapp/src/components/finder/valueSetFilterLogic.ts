import type { ReactNode } from 'react';
import type { DoesFilterPassParams } from 'ag-grid-community';

export type FilterValue = string | number;

export interface ValueSetOption {
  value: FilterValue;
  label?: string;
  /** Image shown next to the label (e.g. breakthrough icon). */
  icon?: string;
  /** Shown instead of the label (e.g. a bar meter) */
  content?: ReactNode;
}

export interface ValueSetFilterParams {
  options: ValueSetOption[];
  /** Show a search box above the list. */
  searchable?: boolean;
}

export interface ValueSetFilterModel {
  values: FilterValue[];
}

/**
 * Filter logic, used by the grid as doesFilterPass (filter handler mode). It works on the
 * model alone, so a filter restored with setFilterModel() applies even if its UI was never opened.
 */
export function valueSetDoesFilterPass({
  model,
  node,
  handlerParams,
}: DoesFilterPassParams<unknown, unknown, ValueSetFilterModel | null>): boolean {
  if (!model?.values.length) return true;
  return model.values.includes(handlerParams.getValue(node) as FilterValue);
}
