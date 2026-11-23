import { Link } from 'react-router';
import {
  MAX_WEIGHT,
  PRESETS,
  SCORE_CRITERIA,
  sameWeights,
  setWeight,
  setWeights,
  totalWeight,
  useWeights,
} from '../../data/score';
import './ScoreWeights.css';

const GROUPS = ['Resources', 'Disasters', 'Site'] as const;
/** -2 … +2 */
const LEVELS = Array.from({ length: MAX_WEIGHT * 2 + 1 }, (_, i) => i - MAX_WEIGHT);
const SYMBOL: Record<number, string> = { [-2]: '‹‹', [-1]: '‹', 0: '·', 1: '›', 2: '››' };

const levelName = (level: number, less: string, more: string) => {
  if (level === 0) return 'ignore';
  const word = level < 0 ? less : more;
  return Math.abs(level) === MAX_WEIGHT ? `much ${word}` : word;
};

/** What the player wants: less or more of each criterion, or ignore it. */
export default function ScoreWeights({
  mapLink,
}: {
  mapLink: { pathname: string; search: string };
}) {
  const current = useWeights();
  const activePreset = PRESETS.find((p) => sameWeights(p.weights, current));
  const hasScore = totalWeight(current) > 0;

  return (
    <section className="ScoreWeights card" aria-label="Match preferences">
      <div className="sw-presets" role="group" aria-label="Presets">
        <span className="card-label">Preset</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            className={`sw-preset${activePreset === preset ? ' active' : ''}`}
            aria-pressed={activePreset === preset}
            onClick={() => setWeights(preset.weights)}
          >
            {preset.label}
          </button>
        ))}
        <span className={`sw-preset custom${activePreset ? '' : ' active'}`}>Custom</span>
      </div>

      <div className="sw-groups">
        {GROUPS.map((group) => (
          <div className="sw-group" key={group}>
            <h2 className="card-label">{group}</h2>
            {SCORE_CRITERIA.filter((c) => c.group === group).map((c) => {
              const value = current[c.key] ?? 0;
              return (
                <div className="sw-row" key={c.key}>
                  <span className="sw-name">{c.label}</span>
                  <span className="sw-end sw-less">{c.less}</span>
                  <div className="sw-levels segmented" role="radiogroup" aria-label={c.label}>
                    {LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={value === level}
                        aria-label={levelName(level, c.less, c.more)}
                        title={levelName(level, c.less, c.more)}
                        className={value === level && level === 0 ? 'off' : undefined}
                        onClick={() => setWeight(c.key, level)}
                      >
                        {SYMBOL[level]}
                      </button>
                    ))}
                  </div>
                  <span className="sw-end">{c.more}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="sw-footer">
        <span>
          {hasScore
            ? 'The Match column ranks the sites by how well they fit (0–100). Use the column filters for hard requirements.'
            : 'Everything is ignored. Pick less or more for at least one criterion.'}
        </span>
        <Link className="btn" to={mapLink} aria-disabled={!hasScore}>
          Show match on map
        </Link>
      </div>
    </section>
  );
}
