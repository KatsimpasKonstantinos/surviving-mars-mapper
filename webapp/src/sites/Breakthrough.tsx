import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router';
import type { coordinateString, MapData } from '../types';
import './Breakthrough.css';
import { computeBreakthroughTiers, formatBreakthroughName } from '../helper/BreakthroughTiers';
import { getBreakthroughImageSrc } from '../helper/BreakthroughPreview';
import BreakthroughTooltip from '../components/BreakthroughTooltip';
import PageWrapper from '../components/PageWrapper';
import CoordinateInput from '../components/CoordinateInput';
import Clipboard from '../components/App/Clipboard';
import CompareToggle from '../components/CompareToggle';
import {
  BREAKTHROUGH_PARAM,
  breakthroughSearch,
  coordinateSearch,
  useSearchParam,
} from '../hooks/useUrlSync';

/** From this choice on, the game has usually changed the pool: shown as uncertain */
const UNCERTAIN_FROM = 6;

interface BreakthroughProps {
  coordString: coordinateString | null;
  setCoordString: (val: coordinateString | null) => void;
  mapData: MapData;
}

function Breakthrough({ coordString, setCoordString, mapData }: BreakthroughProps) {
  const [pathParam, setPathParam] = useSearchParam(BREAKTHROUGH_PARAM);
  const site = coordString ? mapData[coordString] : undefined;

  // The picked path lives in the URL (?bt=A,B,C) so a whole plan can be shared.
  // Anything that is not a valid choice for this site is dropped.
  const { tiers, activePath } = useMemo(() => {
    if (!site) return { tiers: [] as string[][], activePath: [] as string[] };
    const seed = BigInt(site.xxhashShuffleBreakThroughTech);
    const requested = pathParam ? pathParam.split(',').filter(Boolean) : [];
    const all = computeBreakthroughTiers(seed, requested);
    let valid = 0;
    while (valid < requested.length && all[valid].includes(requested[valid])) valid++;
    return { tiers: all.slice(0, valid + 1), activePath: requested.slice(0, valid) };
  }, [site, pathParam]);

  // One more level: for each option of the open choice, what the choice after it offers.
  const lookahead = useMemo(() => {
    const open = tiers.at(-1);
    if (!site || !open) return new Map<string, string[]>();
    const seed = BigInt(site.xxhashShuffleBreakThroughTech);
    return new Map(
      open.map((tech) => [tech, computeBreakthroughTiers(seed, [...activePath, tech]).at(-1)!]),
    );
  }, [site, tiers, activePath]);

  // When a pick adds a new tier, bring it into view (the tree grows downwards).
  const listRef = useRef<HTMLOListElement>(null);
  const prevTierCount = useRef(tiers.length);
  useEffect(() => {
    if (tiers.length > prevTierCount.current) {
      listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevTierCount.current = tiers.length;
  }, [tiers.length]);

  const setPath = (path: string[]) => setPathParam(path.join(','));

  const handleNodeClick = (techId: string, tierIndex: number) => {
    setPath([...activePath.slice(0, tierIndex), techId]);
  };

  const siteInput = (
    <CoordinateInput key={coordString ?? ''} value={coordString} onCommit={setCoordString} />
  );

  if (!coordString || !site)
    return (
      <PageWrapper>
        <div className="Breakthrough-select-coordinate">
          <h1>Breakthrough Predictor</h1>
          <p>
            Enter a coordinate or select a site on the{' '}
            <Link className="panel-link" to="/">
              map
            </Link>{' '}
            to view its breakthroughs.
          </p>
          {siteInput}
        </div>
      </PageWrapper>
    );

  return (
    <div className="Breakthrough card">
      <PageWrapper>
        <div className="breakthrough-header">
          <h1>Breakthroughs</h1>
          <div className="breakthrough-site">
            {siteInput}
            <Clipboard
              copy={() =>
                `${window.location.origin}/breakthrough${breakthroughSearch(coordString, activePath)}`
              }
              label="Copy link to this breakthrough path"
              icon="link"
            />
          </div>
          <p className="breakthrough-meta">
            {site.SiteName && <>{site.SiteName} · </>}
            {site.Topography} · Challenge {site.Difficulty}% ·{' '}
            <Link
              className="panel-link"
              to={{ pathname: '/', search: coordinateSearch(coordString) }}
            >
              Show on map
            </Link>
            <CompareToggle site={coordString} variant="chip" />
          </p>
          <p className="breakthrough-help">
            Pick one breakthrough per choice. Below each option you see what the choice after it
            would offer; click one of those to pick both.
          </p>
        </div>

        <ol className="anomaly-tree-container" ref={listRef}>
          {tiers.map((tierTechs, tierIndex) => {
            const picked = activePath[tierIndex];

            return (
              <li
                className={`tree-tier${tierIndex + 1 >= UNCERTAIN_FROM ? ' uncertain' : ''}`}
                key={tierIndex}
              >
                <h2 className="tier-title">Choice {tierIndex + 1}</h2>
                {tierIndex + 1 === UNCERTAIN_FROM && (
                  <p className="tier-warning">
                    <span className="tier-warning-badge" aria-hidden="true">
                      !
                    </span>
                    From here on the prediction may be inaccurate: after the early game, Planetary
                    Anomalies, researching asteroids, Wonders etc. mix up the breakthrough pool.
                  </p>
                )}
                <div className="tech-nodes">
                  {tierTechs.map((tech) => {
                    const classes = ['tech-node'];
                    if (picked === tech) classes.push('active');
                    else if (picked) classes.push('dimmed');
                    const name = formatBreakthroughName(tech);
                    const next = picked ? undefined : lookahead.get(tech);
                    return (
                      <div className="tech-option" key={tech}>
                        <BreakthroughTooltip id={tech}>
                          <button
                            type="button"
                            className={classes.join(' ')}
                            aria-pressed={picked === tech}
                            onClick={() => handleNodeClick(tech, tierIndex)}
                          >
                            <img src={getBreakthroughImageSrc(tech)} alt="" className="tech-icon" />
                            <span className="tech-name">{name}</span>
                          </button>
                        </BreakthroughTooltip>
                        {next && next.length > 0 && (
                          <div className="tech-next" role="group" aria-label={`After ${name}`}>
                            <span className="tech-next-label">then</span>
                            {next.map((nextTech) => (
                              <BreakthroughTooltip
                                id={nextTech}
                                key={nextTech}
                                showWithoutDescription
                              >
                                <button
                                  type="button"
                                  className="tech-next-item"
                                  aria-label={`Pick ${name}, then ${formatBreakthroughName(nextTech)}`}
                                  onClick={() =>
                                    setPath([...activePath.slice(0, tierIndex), tech, nextTech])
                                  }
                                >
                                  <img src={getBreakthroughImageSrc(nextTech)} alt="" />
                                </button>
                              </BreakthroughTooltip>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>

        {activePath.length > 0 && (
          <button type="button" className="breakthrough-reset" onClick={() => setPath([])}>
            Clear choices
          </button>
        )}
      </PageWrapper>
    </div>
  );
}

export default Breakthrough;
