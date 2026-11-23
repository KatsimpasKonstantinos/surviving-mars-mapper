import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Link, useSearchParams } from 'react-router';
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  CustomFilterModule,
  QuickFilterModule,
  RowApiModule,
  ClientSideRowModelApiModule,
  RenderApiModule,
  TooltipModule,
  ValidationModule,
  themeAlpine,
  type ColDef,
  type ColGroupDef,
  type GridApi,
  type ICellRendererParams,
  type INumberFilterParams,
  type ITextFilterParams,
  type RowClickedEvent,
} from 'ag-grid-community';
import type { coordinateString, MapData, MapDataEntry } from '../types';
import { getBreakthroughImageSrc } from '../helper/BreakthroughPreview';
import { formatBreakthroughName, InvalidTechs } from '../helper/BreakthroughTiers';
import { TechBreakthroughList } from '../helper/TechBreakthroughList';
import {
  breakthroughSearch,
  coordinateSearch,
  LAYER_PARAM,
  PREFS_PARAM,
} from '../hooks/useUrlSync';
import ValueSetFilter from '../components/finder/ValueSetFilter';
import BreakthroughFilter from '../components/finder/BreakthroughFilter';
import {
  breakthroughDoesFilterPass,
  breakthroughGoal,
  type BreakthroughGoal,
} from '../components/finder/breakthroughFilterLogic';
import {
  valueSetDoesFilterPass,
  type ValueSetFilterParams,
  type ValueSetOption,
} from '../components/finder/valueSetFilterLogic';
import MapPreviewTooltip from '../components/finder/MapPreviewTooltip';
import BreakthroughTooltip from '../components/BreakthroughTooltip';
import ScoreWeights from '../components/finder/ScoreWeights';
import CompareToggle from '../components/CompareToggle';
import Meter from '../components/Meter';
import ScoreBar from '../components/ScoreBar';
import { pickPath, setPathSearchSites, usePathSearchStatus } from '../data/breakthroughPaths';
import { scoreSites, useWeights, type SiteScores } from '../data/score';
import {
  MAX_BARS,
  RESOURCES,
  sumBars,
  TERRAIN_ORDER,
  THREATS,
  type BarAttribute,
} from '../data/attributes';
import type { FinderSession } from '../data/finderSession';
import { INTERACTIVE } from '../components/Tooltip';
import './Finder.css';

// Only the grid features this page uses. The validation module only adds
// developer warnings (e.g. a missing module), so it stays out of production.
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  CustomFilterModule,
  QuickFilterModule,
  RowApiModule,
  ClientSideRowModelApiModule,
  RenderApiModule,
  TooltipModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
]);

// Theming API: the grid reads the site's design tokens directly, so light/dark
// mode switches with the rest of the page and no theme stylesheet is needed.
const gridTheme = themeAlpine.withParams({
  // Inherit the page's color-scheme so the light-dark() tokens resolve to the active theme.
  browserColorScheme: 'inherit',
  backgroundColor: 'var(--surface-solid)',
  foregroundColor: 'var(--color-text)',
  headerBackgroundColor: 'var(--surface-solid)',
  headerTextColor: 'var(--color-text-secondary)',
  headerFontFamily: 'var(--font-subheading)',
  headerFontSize: 16,
  oddRowBackgroundColor: 'var(--hover)',
  rowHoverColor: 'color-mix(in srgb, var(--color-secondary) 12%, transparent)',
  selectedRowBackgroundColor: 'color-mix(in srgb, var(--color-secondary) 22%, transparent)',
  borderColor: 'var(--border)',
  rowBorder: { color: 'var(--border)' },
  accentColor: 'var(--color-secondary)',
  wrapperBorderRadius: 12,
  columnBorder: false,
  headerColumnResizeHandleColor: 'transparent',
});

interface FinderProps {
  coordString: coordinateString | null;
  setCoordString: (val: coordinateString | null) => void;
  mapData: MapData;
  session: FinderSession;
  onSessionChange: (session: FinderSession) => void;
}

interface FinderRowData extends MapDataEntry {
  Coordinate: coordinateString;
}

type Def = ColDef<FinderRowData>;

const BREAKTHROUGH_COLUMN = 'FirstBreakthroughs';
const QUICK_FILTER_DELAY = 150;

const BREAKTHROUGH_OPTIONS: ValueSetOption[] = TechBreakthroughList.filter(
  (t) => !InvalidTechs.has(t),
)
  .map((id) => ({
    value: id,
    label: formatBreakthroughName(id),
    icon: getBreakthroughImageSrc(id),
  }))
  .sort((a, b) => a.label!.localeCompare(b.label!));

/** Number filter with a single condition and a sensible default comparison. */
const numberFilter = (
  defaultOption: 'lessThanOrEqual' | 'greaterThanOrEqual' | 'inRange',
): Partial<Def> => ({
  filter: 'agNumberColumnFilter',
  filterParams: {
    filterOptions: ['lessThanOrEqual', 'greaterThanOrEqual', 'inRange', 'equals'],
    defaultOption,
    maxNumConditions: 1,
    buttons: ['reset'],
  } satisfies INumberFilterParams,
});

const setFilter = (params: ValueSetFilterParams): Partial<Def> => ({
  filter: { component: ValueSetFilter, doesFilterPass: valueSetDoesFilterPass },
  filterParams: params,
});

/** One column group per kind: the total while collapsed, each attribute when opened */
const barColumns = (
  headerName: 'Threats' | 'Resources',
  attributes: readonly BarAttribute[],
  totalFilter: 'lessThanOrEqual' | 'greaterThanOrEqual',
): ColGroupDef<FinderRowData> => ({
  headerName,
  children: [
    {
      colId: `${headerName}Total`,
      headerName: 'Total',
      headerTooltip: `Sum of all ${headerName === 'Threats' ? 'threat' : 'resource'} bars (${attributes.length}–${attributes.length * MAX_BARS})`,
      columnGroupShow: 'closed',
      minWidth: 110,
      ...numberFilter(totalFilter),
      valueGetter: (params) => (params.data ? sumBars(params.data, attributes) : 0),
    },
    ...attributes.map((a): Def => ({
      field: a.bars,
      headerName: a.label,
      columnGroupShow: 'open',
      ...setFilter({
        options: Array.from({ length: MAX_BARS }, (_, i) => ({
          value: i + 1,
          content: <Meter value={i + 1} label={a.label} compact />,
        })),
      }),
    })),
  ],
});

const distinct = (rows: FinderRowData[], key: 'SiteName' | 'MapTemplateID') =>
  [...new Set(rows.map((r) => r[key]))].sort((a, b) => a.localeCompare(b));

const sameGoal = (a: BreakthroughGoal | null, b: BreakthroughGoal | null) =>
  a?.maxChoices === b?.maxChoices && a?.techs.join() === b?.techs.join();

function Finder({ coordString, setCoordString, mapData, session, onSessionChange }: FinderProps) {
  const gridRef = useRef<AgGridReact<FinderRowData>>(null);
  const [quickFilter, setQuickFilter] = useState(session.quickFilter);
  const [appliedQuickFilter, setAppliedQuickFilter] = useState(session.quickFilter);
  const [displayedCount, setDisplayedCount] = useState<number | null>(null);
  // ?prefs (e.g. from the map's match layer) opens the preferences right away
  const [searchParams] = useSearchParams();
  const [showWeights, setShowWeights] = useState(() => searchParams.has(PREFS_PARAM));
  const weights = useWeights();
  const pathSearch = usePathSearchStatus();

  // The grid reads these through refs, so a change only refreshes the affected column
  // instead of rebuilding 50,901 rows.
  const scores = scoreSites(mapData, weights);
  const scoresRef = useRef<SiteScores | null>(scores);
  const goalRef = useRef<BreakthroughGoal | null>(null);

  useEffect(() => {
    const api = gridRef.current?.api;
    if (scoresRef.current === scores || !api) return;
    scoresRef.current = scores;
    api.refreshCells({ columns: ['Score'], force: true });
    api.onSortChanged();
    if (api.getColumnFilterModel('Score')) api.onFilterChanged();
  }, [scores]);

  // The breakthrough path search runs in a worker: re-filter whenever a result arrives.
  useEffect(() => {
    if (pathSearch.version > 0) gridRef.current?.api?.onFilterChanged();
  }, [pathSearch.version]);

  // Typing in the search box filters 50,901 rows: wait for a short pause.
  useEffect(() => {
    const id = window.setTimeout(() => setAppliedQuickFilter(quickFilter), QUICK_FILTER_DELAY);
    return () => window.clearTimeout(id);
  }, [quickFilter]);

  const rowData = useMemo<FinderRowData[]>(
    () =>
      Object.entries(mapData).map(([coord, data]) => ({
        ...data,
        Coordinate: coord as coordinateString,
      })),
    [mapData],
  );

  /** Remember the filters and hand the matching sites to the map */
  const syncSession = (api: GridApi<FinderRowData>) => {
    let matches: Set<string> | null = null;
    if (api.isAnyFilterPresent()) {
      matches = new Set();
      api.forEachNodeAfterFilter((node) => {
        if (node.data) matches!.add(node.data.Coordinate);
      });
    }
    onSessionChange({
      filterModel: api.getFilterModel(),
      quickFilter: appliedQuickFilter,
      matches,
    });
  };

  const columnDefs = useMemo<(Def | ColGroupDef<FinderRowData>)[]>(() => {
    const topographies = new Set(rowData.map((r) => r.Topography));
    return [
      {
        field: 'Coordinate',
        pinned: 'left',
        flex: 0,
        width: 185,
        filter: 'agTextColumnFilter',
        filterParams: {
          filterOptions: ['contains', 'startsWith', 'equals'],
          maxNumConditions: 1,
          buttons: ['reset'],
        } satisfies ITextFilterParams,
        cellRenderer: (params: ICellRendererParams<FinderRowData>) => (
          <div className="coordinate-cell">
            <span>{params.value}</span>
            <Link
              to={{ pathname: '/', search: coordinateSearch(params.value) }}
              className="chip"
              title="Show on map"
            >
              Map
            </Link>
            <CompareToggle site={params.value ?? null} />
          </div>
        ),
      },
      {
        colId: 'Score',
        headerName: 'Match',
        headerTooltip:
          'How well the site fits your preferences (0–100). Click "Match preferences" to adjust.',
        width: 120,
        flex: 0,
        sort: 'desc',
        valueGetter: (params) => (params.data ? scoresRef.current?.(params.data.Coordinate) : null),
        filter: 'agNumberColumnFilter',
        filterParams: {
          filterOptions: ['greaterThanOrEqual', 'lessThanOrEqual', 'inRange'],
          maxNumConditions: 1,
          buttons: ['reset'],
        } satisfies INumberFilterParams,
        cellRenderer: (params: ICellRendererParams<FinderRowData, number>) => (
          <ScoreBar value={params.value ?? undefined} />
        ),
      },
      {
        field: 'SiteName',
        headerName: 'Site Name',
        flex: 1.4,
        minWidth: 120,
        ...setFilter({
          searchable: true,
          options: distinct(rowData, 'SiteName').map((name) => ({
            value: name,
            label: name || '(unnamed)',
          })),
        }),
      },
      {
        field: 'Difficulty',
        headerName: 'Challenge',
        minWidth: 140,
        ...numberFilter('lessThanOrEqual'),
      },
      {
        headerName: 'Environment',
        children: [
          {
            field: 'Topography',
            minWidth: 165,
            ...setFilter({
              options: TERRAIN_ORDER.filter((t) => topographies.has(t)).map((t) => ({ value: t })),
            }),
          },
          {
            field: 'Temperature',
            headerName: 'Temp (°C)',
            columnGroupShow: 'open',
            minWidth: 100,
            ...numberFilter('greaterThanOrEqual'),
          },
          {
            field: 'Altitude',
            headerName: 'Altitude (m)',
            columnGroupShow: 'open',
            minWidth: 110,
            ...numberFilter('inRange'),
          },
        ],
      },
      barColumns('Threats', THREATS, 'lessThanOrEqual'),
      barColumns('Resources', RESOURCES, 'greaterThanOrEqual'),
      {
        field: BREAKTHROUGH_COLUMN,
        cellDataType: false,
        headerName: 'Breakthroughs',
        headerTooltip:
          'The first choice offered. Filter for breakthroughs to see the pick path that gets them all.',
        minWidth: 300,
        sortable: false,
        filter: { component: BreakthroughFilter, doesFilterPass: breakthroughDoesFilterPass },
        filterParams: { options: BREAKTHROUGH_OPTIONS } satisfies ValueSetFilterParams,
        getQuickFilterText: (params) => params.value?.map(formatBreakthroughName).join(' ') ?? '',
        cellRenderer: (params: ICellRendererParams<FinderRowData, string[]>) => {
          const data = params.data;
          if (!data) return null;
          // With a breakthrough filter: the picks that get all selected; otherwise the first choice
          const goal = goalRef.current;
          const path =
            goal &&
            pickPath(
              data.Coordinate,
              data.xxhashShuffleBreakThroughTech,
              goal.techs,
              goal.maxChoices,
            );
          const techs = path ?? params.value ?? [];
          return (
            <div className={`breakthrough-cell${path ? ' is-path' : ''}`}>
              {techs.map((tech, i) => (
                <Fragment key={tech}>
                  {path && i > 0 && (
                    <span className="path-arrow" aria-hidden="true">
                      ›
                    </span>
                  )}
                  <BreakthroughTooltip id={tech} showWithoutDescription>
                    <img
                      src={getBreakthroughImageSrc(tech)}
                      alt={`${path ? `Pick ${i + 1}: ` : ''}${formatBreakthroughName(tech)}`}
                      className={path && !goal.techs.includes(tech) ? 'filler' : undefined}
                      loading="lazy"
                    />
                  </BreakthroughTooltip>
                </Fragment>
              ))}
              <Link
                to={{
                  pathname: '/breakthrough',
                  search: breakthroughSearch(data.Coordinate, path ?? []),
                }}
                className="chip"
                title={
                  path
                    ? 'Open this pick path on the Breakthrough page'
                    : 'Open the breakthrough tree'
                }
              >
                {path ? 'Path' : 'Tree'}
              </Link>
            </div>
          );
        },
      },
      {
        field: 'MapTemplateID',
        headerName: 'Map ID',
        minWidth: 200,
        tooltip: true,
        tooltipComponent: MapPreviewTooltip,
        ...setFilter({
          searchable: true,
          options: distinct(rowData, 'MapTemplateID').map((id) => ({ value: id })),
        }),
      },
    ];
  }, [rowData]);

  const handleRowClicked = (event: RowClickedEvent<FinderRowData>) => {
    // The grid sees the click before React can stop it: links and buttons in a row
    // (map, compare, path) do their own thing and do not select the row's site
    if ((event.event?.target as Element | null)?.closest(INTERACTIVE)) return;
    if (event.data?.Coordinate) setCoordString(event.data.Coordinate);
  };

  const handleFilterChanged = (api: GridApi<FinderRowData>) => {
    syncSession(api);
    // Breakthrough cells show the pick path for the filter's goal
    const goal = breakthroughGoal(api.getColumnFilterModel(BREAKTHROUGH_COLUMN));
    if (!sameGoal(goal, goalRef.current)) {
      goalRef.current = goal;
      api.refreshCells({ columns: [BREAKTHROUGH_COLUMN], force: true });
    }
  };

  const resetFilters = () => {
    setQuickFilter('');
    gridRef.current?.api?.setFilterModel(null);
  };

  const mapLink = (layer: string) => ({
    pathname: '/',
    search: coordinateSearch(coordString, { [LAYER_PARAM]: layer }),
  });

  return (
    <div className="Finder">
      <h1 className="visually-hidden">Landing site finder</h1>
      <div className="finder-toolbar">
        <input
          type="search"
          className="finder-input"
          placeholder="Search all columns…"
          aria-label="Search all columns"
          value={quickFilter}
          onChange={(e) => setQuickFilter(e.target.value)}
        />
        <button
          type="button"
          className={`finder-reset${showWeights ? ' active' : ''}`}
          aria-expanded={showWeights}
          onClick={() => setShowWeights((v) => !v)}
        >
          Match preferences
        </button>
        <button type="button" className="finder-reset" onClick={resetFilters}>
          Reset filters
        </button>
        <Link
          className="finder-reset"
          to={mapLink('Finder')}
          aria-disabled={!session.matches}
          title={session.matches ? undefined : 'Set a filter first'}
        >
          Show results on map
        </Link>
        <span className="finder-hint">Use the filter icon in a column header to filter it</span>
        <span className="finder-count" aria-live="polite">
          {pathSearch.running && (
            <>Searching breakthrough paths… {Math.round(pathSearch.progress * 100)}% · </>
          )}
          {displayedCount !== null && (
            <>
              {displayedCount.toLocaleString('en-US')} of {rowData.length.toLocaleString('en-US')}{' '}
              sites
            </>
          )}
          {coordString && (
            <>
              {' '}
              · selected <strong>{coordString}</strong>
            </>
          )}
        </span>
      </div>
      {showWeights && <ScoreWeights mapLink={mapLink('Score')} />}
      {!scores && !showWeights && (
        <p className="finder-note">
          All match preferences are set to ignore, so the Match column is empty.
        </p>
      )}
      <div className="container">
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          enableFilterHandlers
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.Coordinate}
          quickFilterText={appliedQuickFilter}
          cacheQuickFilter
          tooltipShowDelay={150}
          tooltipHideDelay={30000}
          onGridReady={(e) => {
            setPathSearchSites(rowData.map((r) => [r.Coordinate, r.xxhashShuffleBreakThroughTech]));
            if (session.filterModel) e.api.setFilterModel(session.filterModel);
          }}
          onFilterChanged={(e) => handleFilterChanged(e.api)}
          onModelUpdated={(e) => setDisplayedCount(e.api.getDisplayedRowCount() ?? null)}
          onRowClicked={handleRowClicked}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            flex: 1,
            minWidth: 90,
          }}
        />
      </div>
    </div>
  );
}

export default Finder;
