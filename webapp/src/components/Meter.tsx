import { MAX_BARS } from '../data/attributes';
import './Meter.css';

/** The game's four slanted bars for a threat or resource level (1–4). */
export default function Meter({
  value,
  label,
  compact = false,
}: {
  value: number;
  label: string;
  /** Smaller bars, e.g. inside a filter list */
  compact?: boolean;
}) {
  return (
    <div
      className={`meter-container${compact ? ' compact' : ''}`}
      role="img"
      aria-label={`${label}: ${value} of ${MAX_BARS}`}
    >
      {Array.from({ length: MAX_BARS }, (_, index) => (
        <div key={index} className={`meter-box${index < value ? ' filled' : ''}`} />
      ))}
    </div>
  );
}
