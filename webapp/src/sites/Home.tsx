import { Link } from 'react-router';
import './Home.css';
import Map from '../components/App/Map';
import type { coordinateString, MapData } from '../types';
import Clipboard from '../components/App/Clipboard';
import CoordinateInput from '../components/CoordinateInput';
import PageWrapper from '../components/PageWrapper';
import Meter from '../components/Meter';
import CompareToggle from '../components/CompareToggle';
import { getMapImageSrc } from '../helper/MapPreview';
import { getBreakthroughImageSrc } from '../helper/BreakthroughPreview';
import { formatBreakthroughName } from '../helper/BreakthroughTiers';
import BreakthroughTooltip from '../components/BreakthroughTooltip';
import { breakthroughSearch, coordinateSearch } from '../hooks/useUrlSync';
import { RESOURCES, THREATS } from '../data/attributes';

interface HomeProps {
  coordString: coordinateString | null;
  setCoordString: (val: coordinateString | null) => void;
  mapData: MapData | null;
  progress: number;
  error: string | null;
  finderMatches: ReadonlySet<string> | null;
}

function Home({ coordString, setCoordString, mapData, progress, error, finderMatches }: HomeProps) {
  const activeData = coordString && mapData ? mapData[coordString] : null;
  const isLoading = !mapData && !error;
  const placeholder = isLoading ? '…' : '---';

  const shareUrl = () =>
    coordString ? `${window.location.origin}/${coordinateSearch(coordString)}` : null;

  return (
    <PageWrapper>
      <div className="Home">
        <div className="main-container">
          <aside className="info-panel" aria-label="Selected landing site">
            <section className="location-card card">
              <div className="location-header">
                {/* Map template thumbnail; enlarges on hover */}
                <img
                  className="map-thumb"
                  src={getMapImageSrc(activeData?.MapTemplateID ?? '')}
                  alt={activeData ? `Map template ${activeData.MapTemplateID}` : 'No site selected'}
                  title={activeData?.MapTemplateID}
                  decoding="async"
                />
                <div className="location-title">
                  <h1
                    className={
                      [
                        activeData?.SiteName ? 'hasColonyName' : '',
                        (activeData?.SiteName.length ?? 0) > 16 ? 'long-name' : '',
                      ]
                        .join(' ')
                        .trim() || undefined
                    }
                    title={activeData?.SiteName || undefined}
                  >
                    {activeData?.SiteName || 'Colony Site'}
                  </h1>
                  <div className="coordinate-field">
                    <CoordinateInput
                      key={coordString ?? ''}
                      value={coordString}
                      onCommit={setCoordString}
                      placeholder="Click the map"
                    />
                    <div className="coordinate-actions">
                      <Clipboard copy={coordString} label="Copy coordinate" />
                      <Clipboard copy={shareUrl} label="Copy link to this site" icon="link" />
                      <CompareToggle site={activeData ? coordString : null} />
                    </div>
                  </div>
                </div>
              </div>

              {isLoading && (
                <div className="panel-loading" role="status">
                  <div className="panel-loading-bar">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                  <span>Loading site data… {progress}%</span>
                </div>
              )}
              {error && (
                <p className="panel-error" role="alert">
                  Site data could not be loaded.
                </p>
              )}

              <dl className="stats-grid">
                <div className="stat">
                  <dt>Altitude</dt>
                  <dd>
                    {activeData ? `${activeData.Altitude.toLocaleString('en-US')} m` : placeholder}
                  </dd>
                </div>
                <div className="stat">
                  <dt>Temp.</dt>
                  <dd>{activeData ? `${activeData.Temperature}°C` : placeholder}</dd>
                </div>
                <div className="stat">
                  <dt>Terrain</dt>
                  <dd>{activeData?.Topography || placeholder}</dd>
                </div>
                <div className="stat">
                  <dt>Challenge</dt>
                  <dd>{activeData ? `${activeData.Difficulty}%` : placeholder}</dd>
                </div>
              </dl>
            </section>

            <section className="analysis-card card">
              <div className="analysis-section">
                <div className="analysis-column">
                  <h2 className="card-label">Threats</h2>
                  {THREATS.map(({ bars, label }) => (
                    <div className="analysis-row" key={bars}>
                      <Meter value={activeData?.[bars] ?? 0} label={label} />
                      <div className="analysis-name">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="analysis-column">
                  <h2 className="card-label">Resources</h2>
                  {RESOURCES.map(({ bars, label }) => (
                    <div className="analysis-row" key={bars}>
                      <Meter value={activeData?.[bars] ?? 0} label={label} />
                      <div className="analysis-name">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="breakthrough-preview card">
              <div className="card-header">
                <h2 className="card-label">First breakthrough choice</h2>
                {activeData && (
                  <Link
                    className="panel-link"
                    to={{ pathname: '/breakthrough', search: coordinateSearch(coordString) }}
                  >
                    Full tree →
                  </Link>
                )}
              </div>
              <ul>
                {activeData
                  ? activeData.FirstBreakthroughs.map((tech) => (
                      <li key={tech}>
                        <BreakthroughTooltip id={tech}>
                          {/* Opens the tree with this breakthrough already picked */}
                          <Link
                            className="bt-item"
                            to={{
                              pathname: '/breakthrough',
                              search: breakthroughSearch(coordString!, [tech]),
                            }}
                          >
                            <img src={getBreakthroughImageSrc(tech)} alt="" />
                            <span>{formatBreakthroughName(tech)}</span>
                          </Link>
                        </BreakthroughTooltip>
                      </li>
                    ))
                  : [0, 1, 2].map((i) => (
                      <li key={i} className="placeholder" aria-hidden="true">
                        <div className="breakthrough-placeholder" />
                        <span>{i === 1 ? 'Select a site' : ''}</span>
                      </li>
                    ))}
              </ul>
            </section>
          </aside>

          <section className="map-section" aria-label="Mars map">
            <Map
              coordString={coordString}
              setCoordString={setCoordString}
              mapData={mapData}
              finderMatches={finderMatches}
            />
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}

export default Home;
