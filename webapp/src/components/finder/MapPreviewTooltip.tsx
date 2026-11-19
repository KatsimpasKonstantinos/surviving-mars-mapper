import type { CustomTooltipProps } from 'ag-grid-react';
import { getMapImageSrc } from '../../helper/MapPreview';

/**
 * Map template preview for the Map ID column. Rendered by the grid's tooltip
 * layer, so it is never clipped by the header or covered by neighbouring rows.
 */
export default function MapPreviewTooltip({ value }: CustomTooltipProps<unknown, string>) {
  if (!value) return null;
  return (
    <div className="map-preview-tooltip">
      <img src={getMapImageSrc(value)} alt={`Map template ${value}`} />
      <span>{value}</span>
    </div>
  );
}
