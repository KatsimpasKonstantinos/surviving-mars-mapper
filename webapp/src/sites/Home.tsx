import { Link } from 'react-router';
import './Home.css';
import Map from '../components/App/Map';
import type { coordinateString, MapData } from '../types';
import Clipboard from '../components/App/Clipboard';
import CoordinateInput from '../components/CoordinateInput';
import PageWrapper from '../components/PageWrapper';
import { getMapImageSrc } from '../helper/MapPreview';
import { getBreakthroughImageSrc } from '../helper/BreakthroughPreview';
import { formatBreakthroughName } from '../helper/BreakthroughTiers';
import { coordinateSearch } from '../hooks/useUrlSync';

interface HomeProps {
  coordString: coordinateString | null;
  setCoordString: (val: coordinateString | null) => void;
  mapData: MapData | null;
  progress: number;
  error: string | null;
}

const THREATS = [
  { key: 'DustDevilsBars', label: 'Dust Devils' },
  { key: 'DustStormBars', label: 'Dust Storms' },
  { key: 'MeteorBars', label: 'Meteors' },
  { key: 'ColdWaveBars', label: 'Cold Waves' },
] as const;

const RESOURCES = [
  { key: 'MetalsBars', label: 'Metals' },
  { key: 'ConcreteBars', label: 'Concrete' },
  { key: 'WaterBars', label: 'Water' },
] as const;

const TOTAL_BARS = 4;

function Meter({
  value,
  type,
  label,
}: {
  value: number;
  type: 'threat' | 'resource';
  label: string;
}) {
  const fillClass = type === 'threat' ? 'filled-threat' : 'filled-resource';
  return (
    <div className="meter-container" role="img" aria-label={`${label}: ${value} of ${TOTAL_BARS}`}>
      {Array.from({ length: TOTAL_BARS }).map((_, index) => (
        <div key={index} className={`meter-box ${index < value ? fillClass : ''}`}></div>
      ))}
    </div>
  );
}

function Home({ coordString, setCoordString, mapData, progress, error }: HomeProps) {
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
                <div className="location-title">
                  <p className="card-label">Landing site</p>
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
                </div>
                {/* Map template thumbnail; enlarges on hover */}
                <img
                  className="map-thumb"
                  src={getMapImageSrc(activeData?.MapTemplateID ?? '')}
                  alt={activeData ? `Map template ${activeData.MapTemplateID}` : 'No site selected'}
                  title={activeData?.MapTemplateID}
                  decoding="async"
                />
              </div>
              <div className="coordinate-row">
                <CoordinateInput
                  key={coordString ?? ''}
                  value={coordString}
                  onCommit={setCoordString}
                  placeholder="Click the map"
                />
                <Clipboard copy={coordString} label="Copy coordinate" />
                <Clipboard copy={shareUrl} label="Copy link to this site" icon="link" />
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
                  <dt>Temperature</dt>
                  <dd>{activeData ? `${activeData.Temperature}°C` : placeholder}</dd>
                </div>
                <div className="stat">
                  <dt>Topography</dt>
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
                  {THREATS.map(({ key, label }) => (
                    <div className="analysis-row" key={key}>
                      <Meter value={activeData?.[key] ?? 0} type="threat" label={label} />
                      <div className="analysis-name">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="analysis-column">
                  <h2 className="card-label">Resources</h2>
                  {RESOURCES.map(({ key, label }) => (
                    <div className="analysis-row" key={key}>
                      <Meter value={activeData?.[key] ?? 0} type="resource" label={label} />
                      <div className="analysis-name">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {activeData && (
              <section className="breakthrough-preview card">
                <div className="card-header">
                  <h2 className="card-label">First breakthrough choice</h2>
                  <Link
                    className="panel-link"
                    to={{ pathname: '/breakthrough', search: coordinateSearch(coordString) }}
                  >
                    Full tree →
                  </Link>
                </div>
                <ul>
                  {activeData.FirstBreakthroughs.map((tech) => (
                    <li key={tech} title={formatBreakthroughName(tech)}>
                      <img src={getBreakthroughImageSrc(tech)} alt="" />
                      <span>{formatBreakthroughName(tech)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>

          <section className="map-section" aria-label="Mars map">
            <Map coordString={coordString} setCoordString={setCoordString} mapData={mapData} />
          </section>
        </div>
      </div>
    </PageWrapper>
  );
}

export default Home;
