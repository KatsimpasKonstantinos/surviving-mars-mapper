import type { coordinateString } from '../types';
import { MAX_COMPARE, toggleCompareSite, useCompareSites } from '../data/compare';
import './CompareToggle.css';

/** Pins / unpins a site for the Compare page. */
export default function CompareToggle({
  site,
  variant = 'icon',
}: {
  site: coordinateString | null;
  /** "icon" for tight spots (coordinate field, Finder rows), "chip" with a label */
  variant?: 'icon' | 'chip';
}) {
  const sites = useCompareSites();
  const pinned = site !== null && sites.includes(site);
  const full = !pinned && sites.length >= MAX_COMPARE;
  const label = !site
    ? 'Select a site to compare it'
    : pinned
      ? 'Remove from comparison'
      : full
        ? `Comparison is full (${MAX_COMPARE} sites)`
        : 'Add to comparison';

  return (
    <button
      type="button"
      className={`CompareToggle ${variant}${pinned ? ' pinned' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (site) toggleCompareSite(site);
      }}
      disabled={!site || full}
      aria-pressed={pinned}
      aria-label={label}
      title={label}
    >
      {/* Two columns side by side; a check when pinned */}
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="7" height="16" rx="1.5" />
        <rect x="14" y="4" width="7" height="16" rx="1.5" />
        {pinned && <path className="check" d="m5 12 1.8 1.8L9 10.5" />}
      </svg>
      {variant === 'chip' && <span>{pinned ? 'Pinned' : 'Compare'}</span>}
    </button>
  );
}
