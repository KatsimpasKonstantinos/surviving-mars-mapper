import type { CustomFilterDisplayProps } from 'ag-grid-react';
import type { ValueSetFilterModel, ValueSetFilterParams } from './valueSetFilterLogic';
import CheckboxList from './CheckboxList';

/**
 * Checkbox-list column filter (AG Grid Community has no set filter).
 * Nothing checked = filter inactive.
 */
export default function ValueSetFilter({
  model,
  onModelChange,
  colDef,
}: CustomFilterDisplayProps<unknown, unknown, ValueSetFilterModel>) {
  const { options, searchable } = colDef.filterParams as ValueSetFilterParams;
  return (
    <CheckboxList
      options={options}
      searchable={searchable}
      selected={model?.values ?? []}
      onChange={(values) => onModelChange(values.length ? { values } : null)}
    />
  );
}
