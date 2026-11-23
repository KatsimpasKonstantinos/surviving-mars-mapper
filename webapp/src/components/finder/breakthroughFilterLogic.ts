import type { DoesFilterPassParams } from 'ag-grid-community';
import { sitesWithPath } from '../../data/breakthroughPaths';
import type { MapDataEntry } from '../../types';

export interface BreakthroughFilterModel {
  values: string[];
  /** Get all selected by this choice (never below the number selected) */
  maxChoices?: number;
}

export interface BreakthroughGoal {
  techs: string[];
  maxChoices: number;
}

/** Selected breakthroughs and choices of an active breakthrough filter, or null */
export function breakthroughGoal(model: BreakthroughFilterModel | null): BreakthroughGoal | null {
  if (!model?.values.length) return null;
  return {
    techs: model.values,
    maxChoices: Math.max(model.maxChoices ?? 1, model.values.length),
  };
}

/**
 * Breakthrough filter: sites with a pick path that gets every selected breakthrough
 * within maxChoices choices. One breakthrough at the first choice is just the
 * first offer; everything else is searched in a worker. While that runs, no site
 * matches, and the grid re-filters when the result arrives (see Finder).
 */
export function breakthroughDoesFilterPass({
  model,
  node,
}: DoesFilterPassParams<unknown, unknown, BreakthroughFilterModel | null>): boolean {
  const goal = breakthroughGoal(model);
  if (!goal) return true;
  const site = node.data as MapDataEntry & { Coordinate: string };
  if (goal.maxChoices === 1) return site.FirstBreakthroughs.includes(goal.techs[0]);
  return sitesWithPath(goal.techs, goal.maxChoices)?.has(site.Coordinate) ?? false;
}
