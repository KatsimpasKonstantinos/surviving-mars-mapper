import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { coordinateString, MapData, MapDataEntry } from '../types';
import PageWrapper from '../components/PageWrapper';
import Meter from '../components/Meter';
import ScoreBar from '../components/ScoreBar';
import Clipboard from '../components/App/Clipboard';
import BreakthroughTooltip from '../components/BreakthroughTooltip';
import { getMapImageSrc } from '../helper/MapPreview';
import { getBreakthroughImageSrc } from '../helper/BreakthroughPreview';
import { formatBreakthroughName } from '../helper/BreakthroughTiers';
import {
  breakthroughSearch,
  coordinateSearch,
  PREFS_PARAM,
  SITES_PARAM,
  useSearchParam,
} from '../hooks/useUrlSync';
import { MAX_COMPARE, parseSites, setCompareSites, useCompareSites } from '../data/compare';
import { SCORE_CRITERIA, scoreSites, useWeights } from '../data/score';
import { RESOURCES, THREATS } from '../data/attributes';
import './Compare.css';

interface CompareProps {
  mapData: MapData;
}

interface Row {
  label: string;
  /** Extra content in the row header, below the label */
  note?: ReactNode;
  render: (entry: MapDataEntry, site: coordinateString) => ReactNode;
  /** Value used to mark the best site in this row (omit when there is no "better") */
  best?: {
    value: (entry: MapDataEntry, site: coordinateString) => number | undefined;
    higher: boolean;
  };
}

function Compare({ mapData }: CompareProps) {
  const pinned = useCompareSites();
  const weights = useWeights();
  const scores = scoreSites(mapData, weights);

  const sites = pinned.filter((s) => mapData[s]);
  const sitesKey = sites.join(',');

  // A shared link (?sites=…) replaces the pinned list once; after that the URL follows the
  // list, so the address bar can be shared too.
  const [linkSites, setLinkSites] = useSearchParam(SITES_PARAM);
  const adoptedLink = useRef(false);
  const writeLink = useEffectEvent((key: string) => setLinkSites(key || null));
  useEffect(() => {
    if (!adoptedLink.current) {
      adoptedLink.current = true;
      if (linkSites !== null) {
        setCompareSites(parseSites(linkSites));
        return;
      }
    }
    if (sitesKey !== (linkSites ?? '')) writeLink(sitesKey);
  }, [sitesKey, linkSites]);

  /**
   * "Best" follows the match preferences: wanting more meteors highlights the most meteors.
   * Ignored criteria fall back to `fallback` (more resources, fewer disasters) or no highlight.
   */
  const preferred = (key: string, fallback?: 'higher' | 'lower'): Row['best'] => {
    const weight = weights[key] ?? 0;
    const direction = weight > 0 ? 'higher' : weight < 0 ? 'lower' : fallback;
    const criterion = SCORE_CRITERIA.find((c) => c.key === key);
    if (!direction || !criterion) return undefined;
    return { value: criterion.value, higher: direction === 'higher' };
  };

  const rows: Row[] = [
    // Always shown, right below the site names: the reason to compare in the first place
    {
      label: 'Match',
      note: (
        <Link
          className="panel-link compare-row-link"
          to={{ pathname: '/finder', search: coordinateSearch(null, { [PREFS_PARAM]: '1' }) }}
        >
          {scores ? 'Preferences' : 'Set preferences'}
        </Link>
      ),
      render: (_, s) => <ScoreBar value={scores?.(s)} />,
      best: scores ? { value: (_, s) => scores(s), higher: true } : undefined,
    },
    {
      label: 'Map template',
      render: (e) => (
        <img
          className="compare-thumb"
          src={getMapImageSrc(e.MapTemplateID)}
          alt={`Map template ${e.MapTemplateID}`}
          title={e.MapTemplateID}
        />
      ),
    },
    { label: 'Altitude', render: (e) => `${e.Altitude.toLocaleString('en-US')} m` },
    { label: 'Temperature', render: (e) => `${e.Temperature}°C` },
    { label: 'Terrain', render: (e) => e.Topography, best: preferred('terrain') },
    { label: 'Challenge', render: (e) => `${e.Difficulty}%`, best: preferred('challenge') },
    // Without a preference: fewer disasters, more resources
    ...[...THREATS, ...RESOURCES].map((a): Row => ({
      label: a.label,
      render: (e) => <Meter value={e[a.bars]} label={a.label} />,
      best: preferred(a.criterion, a.kind === 'threat' ? 'lower' : 'higher'),
    })),
    {
      label: 'First breakthroughs',
      render: (e, s) => (
        <div className="compare-breakthroughs">
          {e.FirstBreakthroughs.map((tech) => (
            <BreakthroughTooltip id={tech} key={tech} showWithoutDescription>
              <Link
                to={{ pathname: '/breakthrough', search: breakthroughSearch(s, [tech]) }}
                aria-label={`${formatBreakthroughName(tech)}: open the tree with this pick`}
              >
                <img src={getBreakthroughImageSrc(tech)} alt="" />
              </Link>
            </BreakthroughTooltip>
          ))}
        </div>
      ),
    },
  ];

  /** Sites holding the best value of a row (only meaningful with 2+ sites) */
  const bestSites = (row: Row) => {
    if (!row.best || sites.length < 2) return new Set<string>();
    const values = sites.map((s) => row.best!.value(mapData[s], s));
    const valid = values.filter((v): v is number => v !== undefined);
    if (valid.length < 2 || new Set(valid).size === 1) return new Set<string>();
    const target = row.best.higher ? Math.max(...valid) : Math.min(...valid);
    return new Set(sites.filter((_, i) => values[i] === target));
  };

  if (!sites.length)
    return (
      <PageWrapper>
        <div className="Compare">
          <h1>Compare sites</h1>
          <section className="card compare-empty">
            <p>No sites pinned yet.</p>
            <p>
              Pin up to {MAX_COMPARE} landing sites with the compare button next to the coordinate
              on the <Link to="/">map</Link>, or in the <Link to="/finder">Finder</Link>, to see
              them side by side.
            </p>
          </section>
        </div>
      </PageWrapper>
    );

  return (
    <PageWrapper>
      <div className="Compare">
        <div className="compare-header">
          <h1>Compare sites</h1>
          <Clipboard
            copy={() => `${window.location.origin}/compare?${SITES_PARAM}=${sitesKey}`}
            label="Copy link to this comparison"
            icon="link"
          />
          <button type="button" className="btn compare-clear" onClick={() => setCompareSites([])}>
            Clear all
          </button>
        </div>

        <div className="card compare-scroll">
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col" className="compare-corner">
                  {sites.length} of {MAX_COMPARE}
                </th>
                {sites.map((site) => (
                  <th scope="col" key={site}>
                    <div className="compare-site">
                      <Link
                        to={{ pathname: '/', search: coordinateSearch(site) }}
                        className="compare-coord"
                      >
                        {site}
                      </Link>
                      <button
                        type="button"
                        className="compare-remove"
                        onClick={() => setCompareSites(pinned.filter((s) => s !== site))}
                        aria-label={`Remove ${site} from comparison`}
                        title="Remove"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>
                    <div className="compare-name">{mapData[site].SiteName || 'Colony Site'}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const best = bestSites(row);
                return (
                  <tr key={row.label}>
                    <th scope="row">
                      {row.label}
                      {row.note}
                    </th>
                    {sites.map((site) => (
                      <td key={site} className={best.has(site) ? 'best' : undefined}>
                        {row.render(mapData[site], site)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="compare-note">
          Highlighted: the best value in a row, following your match preferences in the Finder
          (without a preference: more resources, fewer disasters). Disasters and resources are
          compared on their exact values, so sites with the same number of bars can still differ.
        </p>
      </div>
    </PageWrapper>
  );
}

export default Compare;
