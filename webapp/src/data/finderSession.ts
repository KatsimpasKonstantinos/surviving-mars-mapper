/**
 * What the Finder remembers while the user visits other pages: its filters
 * (restored when coming back) and the sites they match (shown on the map).
 */
export interface FinderSession {
  /** AG Grid filter model, as returned by api.getFilterModel() */
  filterModel: Record<string, unknown> | null;
  quickFilter: string;
  /** Coordinates passing the filters; null while no filter is active */
  matches: ReadonlySet<string> | null;
}

export const EMPTY_FINDER_SESSION: FinderSession = {
  filterModel: null,
  quickFilter: '',
  matches: null,
};
