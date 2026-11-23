import type { IRowNode } from 'ag-grid-community';
import { describe, expect, test } from 'vite-plus/test';
import {
  valueSetDoesFilterPass,
  type ValueSetFilterModel,
} from '../src/components/finder/valueSetFilterLogic';
import {
  breakthroughDoesFilterPass,
  breakthroughGoal,
  type BreakthroughFilterModel,
} from '../src/components/finder/breakthroughFilterLogic';

type ValueSetParams = Parameters<typeof valueSetDoesFilterPass>[0];
type BreakthroughParams = Parameters<typeof breakthroughDoesFilterPass>[0];

/** Just enough of the grid's parameters for the filter logic */
const passes = (value: unknown, model: ValueSetFilterModel | null) =>
  valueSetDoesFilterPass({
    model,
    node: {} as IRowNode,
    handlerParams: { getValue: () => value },
  } as unknown as ValueSetParams);

describe('value set filter', () => {
  test('nothing selected lets every row through', () => {
    expect(passes('Rough', null)).toBe(true);
    expect(passes('Rough', { values: [] })).toBe(true);
  });

  test('the row value must be one of the selected', () => {
    expect(passes('Rough', { values: ['Rough', 'Steep'] })).toBe(true);
    expect(passes('Very Flat', { values: ['Rough', 'Steep'] })).toBe(false);
    expect(passes(3, { values: [3, 4] })).toBe(true);
  });
});

describe('breakthrough filter', () => {
  const site = { Coordinate: '12N45E', FirstBreakthroughs: ['GiantCrops', 'DesignedForestation'] };
  const passesBt = (model: BreakthroughFilterModel | null) =>
    breakthroughDoesFilterPass({
      model,
      node: { data: site } as IRowNode,
    } as unknown as BreakthroughParams);

  test('one breakthrough at the first choice is the first offer', () => {
    expect(passesBt(null)).toBe(true);
    expect(passesBt({ values: ['GiantCrops'], maxChoices: 1 })).toBe(true);
    expect(passesBt({ values: ['Vocation'], maxChoices: 1 })).toBe(false);
  });

  test('never fewer choices than breakthroughs', () => {
    expect(breakthroughGoal({ values: ['A', 'B', 'C'], maxChoices: 1 })).toEqual({
      techs: ['A', 'B', 'C'],
      maxChoices: 3,
    });
    expect(breakthroughGoal({ values: ['A'] })?.maxChoices).toBe(1);
    expect(breakthroughGoal({ values: [] })).toBeNull();
  });
});
