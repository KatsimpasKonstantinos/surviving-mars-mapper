import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { Link } from 'react-router-dom';
import type { ColDef, ColGroupDef, RowClickedEvent, ValueGetterParams, ICellRendererParams } from 'ag-grid-community';
import { ModuleRegistry, AllCommunityModule, ValidationModule } from 'ag-grid-community';
import { getMapImageSrc } from '../components/App/MapPreview';

ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './Finder.css';
import type { MapData, MapDataEntry } from '../types';

interface FinderProps {
  coordString: string | null;
  setCoordString: (val: string | null) => void;
  mapData: MapData;
}

interface FinderRowData extends MapDataEntry {
  Coordinate: string;
}

const parseNumber = (val: string | number | undefined) => {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return isNaN(num) ? val : num;
};

function Finder({ coordString, setCoordString, mapData }: FinderProps) {

  const rowData = useMemo<FinderRowData[]>(() => {
    return Object.entries(mapData).map(([coord, data]) => ({
      Coordinate: coord,
      ...data,
      Altitude: parseNumber(data.Altitude),
      Temperature: parseNumber(data.Temperature),
      Difficulty: parseNumber(data.Difficulty),
      DustDevilsBars: parseNumber(data.DustDevilsBars),
      DustStormBars: parseNumber(data.DustStormBars),
      MeteorBars: parseNumber(data.MeteorBars),
      ColdWaveBars: parseNumber(data.ColdWaveBars),
      MetalsBars: parseNumber(data.MetalsBars),
      ConcreteBars: parseNumber(data.ConcreteBars),
      WaterBars: parseNumber(data.WaterBars),
    }));
  }, [mapData]);

  const columnDefs = useMemo<(ColDef<FinderRowData> | ColGroupDef<FinderRowData>)[]>(() => [
    {
      field: 'Coordinate',
      pinned: 'left',
      flex: 0,
      width: 170,
      cellRenderer: (params: ICellRendererParams<FinderRowData>) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
          <span style={{ fontWeight: 'bold' }}>{params.value}</span>
          <Link
            to="../"
            className="show-map-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (params.value) setCoordString(params.value);
            }}
          >
            Map
          </Link>
        </div>
      )
    },
    { field: 'SiteName', headerName: 'Site Name', flex: 2, minWidth: 130 },
    { field: 'Difficulty', headerName: 'Difficulty' },
    {
      headerName: 'Environment',
      children: [
        { field: 'Topography' },
        { field: 'Temperature', headerName: 'Temp (°C)', columnGroupShow: 'open' },
        { field: 'Altitude', headerName: 'Altitude (m)', columnGroupShow: 'open' },
      ]
    },
    {
      headerName: 'Threats',
      children: [
        {
          headerName: 'Total',
          columnGroupShow: 'closed',
          valueGetter: (params: ValueGetterParams<FinderRowData>) => {
            const d = params.data;
            if (!d) return 0;
            return (d.DustDevilsBars as number || 0) +
              (d.DustStormBars as number || 0) +
              (d.MeteorBars as number || 0) +
              (d.ColdWaveBars as number || 0);
          }
        },
        { field: 'DustDevilsBars', headerName: 'Dust Devils', columnGroupShow: 'open' },
        { field: 'DustStormBars', headerName: 'Dust Storms', columnGroupShow: 'open' },
        { field: 'MeteorBars', headerName: 'Meteors', columnGroupShow: 'open' },
        { field: 'ColdWaveBars', headerName: 'Cold Waves', columnGroupShow: 'open' },
      ]
    },
    {
      headerName: 'Resources',
      children: [
        {
          headerName: 'Total',
          columnGroupShow: 'closed',
          valueGetter: (params: ValueGetterParams<FinderRowData>) => {
            const d = params.data;
            if (!d) return 0;
            return (d.MetalsBars as number || 0) +
              (d.ConcreteBars as number || 0) +
              (d.WaterBars as number || 0);
          }
        },
        { field: 'MetalsBars', headerName: 'Metals', columnGroupShow: 'open' },
        { field: 'ConcreteBars', headerName: 'Concrete', columnGroupShow: 'open' },
        { field: 'WaterBars', headerName: 'Water', columnGroupShow: 'open' },
      ]
    },
    {
      field: 'MapTemplateID',
      headerName: 'Map ID',
      minWidth: 200,
      cellStyle: { overflow: 'visible' },
      cellRenderer: (params: ICellRendererParams<FinderRowData>) => (
        <div className="map-id-cell">
          <span>{params.value}</span>
          {params.value && (
            <div className="map-preview-popup">
              <img src={getMapImageSrc(params.value)} alt="Map preview" />
            </div>
          )}
        </div>
      )
    }
  ], [setCoordString]);

  const handleRowClicked = (event: RowClickedEvent<FinderRowData>) => {
    if (event.data?.Coordinate) {
      setCoordString(event.data.Coordinate);
    }
  };

  return (
    <div className="Finder">
      <div className="container ag-theme-alpine-dark">
        <AgGridReact
          theme="legacy"
          rowData={rowData}
          columnDefs={columnDefs}
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