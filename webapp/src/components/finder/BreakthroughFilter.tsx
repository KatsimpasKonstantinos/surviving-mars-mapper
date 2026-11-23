import { useState } from 'react';
import type { CustomFilterDisplayProps } from 'ag-grid-react';
import { MAX_CHOICES, MAX_TARGETS, usePathSearchStatus } from '../../data/breakthroughPaths';
import BreakthroughTooltip from '../BreakthroughTooltip';
import CheckboxList from './CheckboxList';
import type { ValueSetFilterParams } from './valueSetFilterLogic';
import { breakthroughGoal, type BreakthroughFilterModel } from './breakthroughFilterLogic';

const ordinal = (n: number) => ['1st', '2nd', '3rd'][n - 1] ?? `${n}th`;

/**
 * Up to three breakthroughs, plus by which choice the site must let you pick all
 * of them. The number of choices is never below the number selected.
 */
export default function BreakthroughFilter({
  model,
  onModelChange,
  colDef,
}: CustomFilterDisplayProps<unknown, unknown, BreakthroughFilterModel>) {
  const { options } = colDef.filterParams as ValueSetFilterParams;
  // Remembered while nothing is selected (the model is null then)
  const [chosen, setChosen] = useState(model?.maxChoices ?? 1);
  const status = usePathSearchStatus();
  const selected = model?.values ?? [];
  const maxChoices = breakthroughGoal(model)?.maxChoices ?? chosen;

  const update = (values: string[], choices = maxChoices) =>
    onModelChange(values.length ? { values, maxChoices: Math.max(choices, values.length) } : null);

  const changeChoices = (n: number) => {
    setChosen(n);
    if (selected.length) update(selected, n);
  };

  let hint = `Pick up to ${MAX_TARGETS} breakthroughs.`;
  if (status.running) hint = `Searching pick paths… ${Math.round(status.progress * 100)}%`;
  else if (selected.length === 1 && maxChoices === 1) hint = 'Offered at the first choice.';
  else if (selected.length > 0)
    hint = `Sites where you can pick ${selected.length === 1 ? 'it' : 'all of them'} by the ${ordinal(maxChoices)} choice.`;

  return (
    <CheckboxList
      options={options}
      searchable
      maxSelected={MAX_TARGETS}
      selected={selected}
      onChange={(values) => update(values as string[])}
      renderIcon={(option, icon) => (
        <BreakthroughTooltip id={String(option.value)}>{icon}</BreakthroughTooltip>
      )}
    >
      <div className="vsf-depth">
        <span id="vsf-depth-label">Get by choice</span>
        <div className="segmented" role="radiogroup" aria-labelledby="vsf-depth-label">
          {Array.from({ length: MAX_CHOICES }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={maxChoices === n}
              aria-label={`${ordinal(n)} choice`}
              disabled={n < selected.length}
              onClick={() => changeChoices(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <small>{hint}</small>
      </div>
    </CheckboxList>
  );
}
