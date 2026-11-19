import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { coordinateString, MapData } from '../types';
import './Breakthrough.css';
import { computeBreakthroughTiers, formatBreakthroughName } from '../helper/BreakthroughTiers';
import { getBreakthroughImageSrc } from '../helper/BreakthroughPreview';
import BreakthroughTooltip from '../components/BreakthroughTooltip';
import PageWrapper from '../components/PageWrapper';
import CoordinateInput from '../components/CoordinateInput';
import Clipboard from '../components/App/Clipboard';
import { BREAKTHROUGH_PARAM, coordinateSearch } from '../hooks/useUrlSync';

interface BreakthroughProps {
  coordString: coordinateString | null;
  setCoordString: (val: coordinateString | null) => void;
  mapData: MapData;
}

function Breakthrough({ coordString, setCoordString, mapData }: BreakthroughProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const site = coordString ? mapData[coordString] : undefined;
  const pathParam = searchParams.get(BREAKTHROUGH_PARAM);

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

  // When a pick adds a new tier, bring it into view (the tree grows downwards).
  const listRef = useRef<HTMLOListElement>(null);
  const prevTierCount = useRef(tiers.length);
  useEffect(() => {
    if (tiers.length > prevTierCount.current) {
      listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    prevTierCount.current = tiers.length;
  }, [tiers.length]);

  const setPath = (path: string[]) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (path.length) next.set(BREAKTHROUGH_PARAM, path.join(','));
        else next.delete(BREAKTHROUGH_PARAM);
        return next;
      },
      { replace: true },
    );
  };

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
            Enter a coordinate or select a site on the <Link to="/">map</Link> to view its
            breakthroughs.
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
                `${window.location.origin}/breakthrough${coordinateSearch(coordString, activePath.length ? { [BREAKTHROUGH_PARAM]: activePath.join(',') } : undefined)}`
              }
              label="Copy link to this breakthrough path"
              icon="link"
            />
          </div>
          <p className="breakthrough-meta">
            {site.SiteName && <>{site.SiteName} · </>}
            {site.Topography} · Challenge {site.Difficulty}% ·{' '}
            <Link to={{ pathname: '/', search: coordinateSearch(coordString) }}>Show on map</Link>
          </p>
          <p>
            <span className="warning">Warning:</span> This Breakthrough predicter may be inaccurate.
            Especially after the early game, when Planetary Anomalies, Researching Asteroids,
            Wonders, etc. mix up the Breakthrough pool.
          </p>
          <p className="breakthrough-help">
            Pick one breakthrough per choice to see what is offered next.
          </p>
        </div>

        <ol className="anomaly-tree-container" ref={listRef}>
          {tiers.map((tierTechs, tierIndex) => {
            if (tierTechs.length === 0) return null;
            const picked = activePath[tierIndex];

            return (
              <li className="tree-tier" key={tierIndex}>
                <h2 className="tier-title">Choice {tierIndex + 1}</h2>
                <div className="tech-nodes">
                  {tierTechs.map((tech) => {
                    const classes = ['tech-node'];
                    if (picked === tech) classes.push('active');
                    else if (picked) classes.push('dimmed');
                    return (
                      <BreakthroughTooltip id={tech} key={tech}>
                        <button
                          type="button"
                          className={classes.join(' ')}
                          aria-pressed={picked === tech}
                          onClick={() => handleNodeClick(tech, tierIndex)}
                        >
                          <img src={getBreakthroughImageSrc(tech)} alt="" className="tech-icon" />
                          <span className="tech-name">{formatBreakthroughName(tech)}</span>
                        </button>
                      </BreakthroughTooltip>
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
