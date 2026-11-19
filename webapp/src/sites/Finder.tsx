import { useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Link } from 'react-router';
import type {
  ColDef,
  ColGroupDef,
  RowClickedEvent,
  ValueGetterParams,
  ICellRendererParams,
  INumberFilterParams,
  ITextFilterParams,
} from 'ag-grid-community';
import {
  ModuleRegistry,
  ClientSideRowModelModule,
  TextFilterModule,
  NumberFilterModule,
  CustomFilterModule,
  QuickFilterModule,
  RowApiModule,
  TooltipModule,
  ValidationModule,
  themeAlpine,
} from 'ag-grid-community';
import { getBreakthroughImageSrc } from '../helper/BreakthroughPreview';
import { formatBreakthroughName, InvalidTechs } from '../helper/BreakthroughTiers';
import { TechBreakthroughList } from '../helper/TechBreakthroughList';
import { coordinateSearch } from '../hooks/useUrlSync';
import ValueSetFilter, {
  type ValueSetFilterParams,
  type ValueSetOption,
} from '../components/finder/ValueSetFilter';
import MapPreviewTooltip from '../components/finder/MapPreviewTooltip';
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
import type { coordinateString, MapData, MapDataEntry } from '../types';

interface FinderProps {
  coordString: coordinateString | null;
  setCoordString: (val: coordinateString | null) => void;
  mapData: MapData;
}

interface FinderRowData extends MapDataEntry {
  Coordinate: coordinateString;
}

type Def = ColDef<FinderRowData>;

const BREAKTHROUGH_OPTIONS: ValueSetOption[] = TechBreakthroughList.filter(
  (t) => !InvalidTechs.has(t),
)
  .map((id) => ({
    value: id,
    label: formatBreakthroughName(id),
    icon: getBreakthroughImageSrc(id),
  }))
  .sort((a, b) => a.label!.localeCompare(b.label!));

const TOPOGRAPHY_ORDER = ['Very Flat', 'Rough', 'Steep', 'Mountainous'];

const sum = (...values: number[]) => values.reduce((a, b) => a + b, 0);

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

/** Checkbox filter for the 1–4 threat/resource bars. */
const barsFilter: Partial<Def> = {
  filter: ValueSetFilter,
  filterParams: {
    options: [1, 2, 3, 4].map((n) => ({ value: n, bars: n })),
  } satisfies ValueSetFilterParams,
};

const setFilter = (params: ValueSetFilterParams): Partial<Def> => ({
  filter: ValueSetFilter,
  filterParams: params,
});

const distinct = (rows: FinderRowData[], key: 'SiteName' | 'MapTemplateID') =>
  [...new Set(rows.map((r) => r[key]))].sort((a, b) => a.localeCompare(b));

function Finder({ coordString, setCoordString, mapData }: FinderProps) {
  const gridRef = useRef<AgGridReact<FinderRowData>>(null);
  const [quickFilter, setQuickFilter] = useState('');
  const [displayedCount, setDisplayedCount] = useState<number | null>(null);

  const rowData = useMemo<FinderRowData[]>(
    () =>
      Object.entries(mapData).map(([coord, data]) => ({
        ...data,
        Coordinate: coord as coordinateString,
      })),
    [mapData],
  );

  const columnDefs = useMemo<(Def | ColGroupDef<FinderRowData>)[]>(() => {
    const topographies = new Set(rowData.map((r) => r.Topography));
    return [
      {
        field: 'Coordinate',
        pinned: 'left',
        flex: 0,
        width: 150,
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
              className="show-map-btn"
              title="Show on map"
              onClick={(e) => {
                e.stopPropagation();
                if (params.value) setCoordString(params.value);
              }}
            >
              Map
            </Link>
          </div>
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
              options: TOPOGRAPHY_ORDER.filter((t) => topographies.has(t)).map((t) => ({
                value: t,
              })),
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
      {
        headerName: 'Threats',
        children: [
          {
            colId: 'ThreatTotal',
            headerName: 'Total',
            headerTooltip: 'Sum of all threat bars (4–16)',
            columnGroupShow: 'closed',
            minWidth: 110,
            ...numberFilter('lessThanOrEqual'),
            valueGetter: (params: ValueGetterParams<FinderRowData>) => {
              const d = params.data;
              return d ? sum(d.DustDevilsBars, d.DustStormBars, d.MeteorBars, d.ColdWaveBars) : 0;
            },
          },
          {
            field: 'DustDevilsBars',
            headerName: 'Dust Devils',
            columnGroupShow: 'open',
            ...barsFilter,
          },
          {
            field: 'DustStormBars',
            headerName: 'Dust Storms',
            columnGroupShow: 'open',
            ...barsFilter,
          },
          { field: 'MeteorBars', headerName: 'Meteors', columnGroupShow: 'open', ...barsFilter },
          {
            field: 'ColdWaveBars',
            headerName: 'Cold Waves',
            columnGroupShow: 'open',
            ...barsFilter,
          },
        ],
      },
      {
        headerName: 'Resources',
        children: [
          {
            colId: 'ResourceTotal',
            headerName: 'Total',
            headerTooltip: 'Sum of all resource bars (3–12)',
            columnGroupShow: 'closed',
            minWidth: 120,
            ...numberFilter('greaterThanOrEqual'),
            valueGetter: (params: ValueGetterParams<FinderRowData>) => {
              const d = params.data;
              return d ? sum(d.MetalsBars, d.ConcreteBars, d.WaterBars) : 0;
            },
          },
          { field: 'MetalsBars', headerName: 'Metals', columnGroupShow: 'open', ...barsFilter },
          { field: 'ConcreteBars', headerName: 'Concrete', columnGroupShow: 'open', ...barsFilter },
          { field: 'WaterBars', headerName: 'Water', columnGroupShow: 'open', ...barsFilter },
        ],
      },
      {
        field: 'FirstBreakthroughs',
        cellDataType: false,
        headerName: 'Breakthroughs',
        headerTooltip: 'The three breakthroughs offered at the first choice',
        minWidth: 180,
        sortable: false,
        ...setFilter({ options: BREAKTHROUGH_OPTIONS, multiValue: true, searchable: true }),
        getQuickFilterText: (params) => params.value?.map(formatBreakthroughName).join(' ') ?? '',
        cellRenderer: (params: ICellRendererParams<FinderRowData, string[]>) => (
          <div className="breakthrough-cell">
            {params.value?.map((tech) => (
              <img
                key={tech}
                src={getBreakthroughImageSrc(tech)}
                alt={formatBreakthroughName(tech)}
                title={formatBreakthroughName(tech)}
                loading="lazy"
              />
            ))}
          </div>
        ),
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
  }, [rowData, setCoordString]);

  const handleRowClicked = (event: RowClickedEvent<FinderRowData>) => {
    if (event.data?.Coordinate) {
      setCoordString(event.data.Coordinate);
    }
  };

  const resetFilters = () => {
    setQuickFilter('');
    gridRef.current?.api?.setFilterModel(null);
  };

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
        <button type="button" className="finder-reset" onClick={resetFilters}>
          Reset filters
        </button>
        <span className="finder-hint">Use the filter icon in a column header to filter it</span>
        <span className="finder-count" aria-live="polite">
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
      <div className="container">
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          getRowId={(params) => params.data.Coordinate}
          quickFilterText={quickFilter}
          tooltipShowDelay={150}
          tooltipHideDelay={30000}
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
