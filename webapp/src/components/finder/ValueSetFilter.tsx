import { useCallback, useId, useMemo, useState } from 'react';
import { useGridFilter, type CustomFilterProps } from 'ag-grid-react';
import type { IDoesFilterPassParams } from 'ag-grid-community';
import './ValueSetFilter.css';

export type FilterValue = string | number;

export interface ValueSetOption {
  value: FilterValue;
  label?: string;
  /** Image shown next to the label (e.g. breakthrough icon). */
  icon?: string;
  /** Render the option as a 1–4 meter instead of text. */
  bars?: number;
}

export interface ValueSetFilterParams {
  options: ValueSetOption[];
  /** The cell value is an array; match if it contains any/all selected values. */
  multiValue?: boolean;
  /** Show a search box above the list. */
  searchable?: boolean;
}

export interface ValueSetFilterModel {
  values: FilterValue[];
  mode?: 'any' | 'all';
}

const TOTAL_BARS = 4;

/**
 * Checkbox-list column filter (AG Grid Community has no set filter).
 * Nothing checked = filter inactive.
 */
export default function ValueSetFilter(
  props: CustomFilterProps<unknown, unknown, ValueSetFilterModel> & ValueSetFilterParams,
) {
  const { model, onModelChange, getValue, options, multiValue = false, searchable = false } = props;
  const [search, setSearch] = useState('');
  const radioName = useId();

  const selected = useMemo(() => new Set(model?.values ?? []), [model]);
  const mode = model?.mode ?? 'any';

  const doesFilterPass = useCallback(
    (params: IDoesFilterPassParams) => {
      if (selected.size === 0) return true;
      const value = getValue(params.node);
      if (multiValue) {
        const arr = (value ?? []) as FilterValue[];
        return mode === 'all'
          ? [...selected].every((v) => arr.includes(v))
          : arr.some((v) => selected.has(v));
      }
      return selected.has(value as FilterValue);
    },
    [selected, mode, multiValue, getValue],
  );

  useGridFilter({ doesFilterPass });

  const update = (values: FilterValue[], nextMode = mode) => {
    onModelChange(values.length ? { values, ...(multiValue ? { mode: nextMode } : {}) } : null);
  };

  const toggle = (value: FilterValue) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    // Keep the option order stable in the model.
    update(options.map((o) => o.value).filter((v) => next.has(v)));
  };

  const query = search.trim().toLowerCase();
  const visible = query
    ? options.filter((o) => (o.label ?? String(o.value)).toLowerCase().includes(query))
    : options;

  return (
    <div className="ValueSetFilter">
      {searchable && (
        <input
          type="search"
          className="vsf-search"
          placeholder="Search…"
          aria-label="Search filter values"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      )}

      {multiValue && (
        <div className="vsf-mode" role="radiogroup" aria-label="Match mode">
          {(['any', 'all'] as const).map((m) => (
            <label key={m}>
              <input
                type="radio"
                name={radioName}
                checked={mode === m}
                onChange={() => update([...selected], m)}
              />
              {m === 'any' ? 'Offers any selected' : 'Offers all selected'}
            </label>
          ))}
        </div>
      )}

      <ul className="vsf-list">
        {visible.map((o) => (
          <li key={o.value}>
            <label>
              <input
                type="checkbox"
                checked={selected.has(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.icon && <img src={o.icon} alt="" loading="lazy" />}
              {o.bars !== undefined ? (
                <span className="vsf-meter" aria-label={`${o.bars} of ${TOTAL_BARS}`}>
                  {Array.from({ length: TOTAL_BARS }, (_, i) => (
                    <i key={i} className={i < o.bars! ? 'filled' : ''} />
                  ))}
                </span>
              ) : (
                <span>{o.label ?? String(o.value)}</span>
              )}
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="vsf-empty">No matches</li>}
      </ul>

      <div className="vsf-footer">
        <span>{selected.size ? `${selected.size} selected` : 'Nothing selected = all'}</span>
        <button type="button" onClick={() => update([])} disabled={selected.size === 0}>
          Clear
        </button>
      </div>
    </div>
  );
}
