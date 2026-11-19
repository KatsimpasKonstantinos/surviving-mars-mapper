import type { ReactNode } from 'react';
import Tooltip from './Tooltip';
import { getBreakthroughInfo } from '../data/breakthroughDescriptions';
import { formatBreakthroughName } from '../helper/BreakthroughTiers';

interface BreakthroughTooltipProps {
  id: string;
  children: ReactNode;
  /** Show the name even when there is no description (for icon-only places like the Finder). */
  showWithoutDescription?: boolean;
}

/** Name, description and notes of a breakthrough, on hover or keyboard focus. */
export default function BreakthroughTooltip({
  id,
  children,
  showWithoutDescription = false,
}: BreakthroughTooltipProps) {
  const info = getBreakthroughInfo(id);
  const content =
    info || showWithoutDescription ? (
      <>
        <strong className="tooltip-title">{formatBreakthroughName(id)}</strong>
        {info && <p className="tooltip-text">{info.description}</p>}
        {info?.notes && (
          <ul className="tooltip-notes">
            {info.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </>
    ) : null;

  return <Tooltip content={content}>{children}</Tooltip>;
}
