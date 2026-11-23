import { useState, type ReactNode } from 'react';
import type { FilterValue, ValueSetOption } from './valueSetFilterLogic';
import './ValueSetFilter.css';

/**
 * The checkbox list inside the Finder's column filters: optional search, the options,
 * and a footer with the selection count and "Clear". Knows nothing about AG Grid.
 */
export default function CheckboxList({
  options,
  selected,
  onChange,
  searchable = false,
  maxSelected,
  renderIcon = (_, icon) => icon,
  children,
}: {
  options: ValueSetOption[];
  selected: readonly FilterValue[];
  /** New selection, in option order */
  onChange: (values: FilterValue[]) => void;
  searchable?: boolean;
  /** At most this many can be checked; the rest are disabled then */
  maxSelected?: number;
  /** Wraps an option's icon, e.g. in a tooltip */
  renderIcon?: (option: ValueSetOption, icon: ReactNode) => ReactNode;
  /** Extra controls above the list */
  children?: ReactNode;
}) {
  const [search, setSearch] = useState('');
  const full = maxSelected !== undefined && selected.length >= maxSelected;

  const toggle = (value: FilterValue) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    // Keep the option order stable in the model.
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)));
  };

  const query = search.trim().toLowerCase();
  const visible = query
    ? options.filter((o) => (o.label ?? String(o.value)).toLowerCase().includes(query))
    : options;

  let footer = selected.length ? `${selected.length} selected` : 'Nothing selected = all';
  if (maxSelected !== undefined) {
    footer = selected.length
      ? `${selected.length} of ${maxSelected} selected`
      : `Pick up to ${maxSelected}`;
  }

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

      {children}

      <ul className="vsf-list">
        {visible.map((o) => {
          const checked = selected.includes(o.value);
          const disabled = !checked && full;
          return (
            <li key={o.value} className={disabled ? 'disabled' : undefined}>
              <label>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(o.value)}
                />
                {o.icon && renderIcon(o, <img src={o.icon} alt="" loading="lazy" />)}
                {o.content ?? <span>{o.label ?? String(o.value)}</span>}
              </label>
            </li>
          );
        })}
        {visible.length === 0 && <li className="vsf-empty">No matches</li>}
      </ul>

      <div className="vsf-footer">
        <span>{footer}</span>
        <button type="button" onClick={() => onChange([])} disabled={selected.length === 0}>
          Clear
        </button>
      </div>
    </div>
  );
}
