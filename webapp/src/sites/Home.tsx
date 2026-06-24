import { useState, useEffect } from 'react'
import './Home.css'
import Map from '../components/App/Map'
import type { coordinateString } from '../types'
import Clipboard from '../components/App/Clipboard'
import PageWrapper from '../components/PageWrapper'
import { getMapImageSrc } from '../components/App/MapPreview'

interface HomeProps {
    coordString: coordinateString | null;
    setCoordString: (val: coordinateString | null) => void;
    mapData: Record<string, any>;
}

function Home({ coordString, setCoordString, mapData }: HomeProps) {
    const [inputCoordValue, setInputCoordValue] = useState<string>('')

    useEffect(() => {
        if (coordString) {
            setInputCoordValue(coordString);
        } else {
            setInputCoordValue('');
        }
    }, [coordString]);

    const activeData = coordString ? mapData[coordString] : null;

    const renderMeters = (value: number, type: 'threat' | 'resource') => {
        const totalBars = 4;
        const fillClass = type === 'threat' ? 'filled-threat' : 'filled-resource';

        return (
            <div className="meter-container">
                {Array.from({ length: totalBars }).map((_, index) => (
                    <div
                        key={index}
                        className={`meter-box ${index < value ? fillClass : ''}`}
                    ></div>
                ))}
            </div>
        );
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputCoordValue(event.target.value);
    };

    const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            setCoordString(inputCoordValue.trim() as coordinateString);
        }
    };

    const handleInputBlur = () => {
        setCoordString(inputCoordValue.trim() as coordinateString);
    };

    return (
        <PageWrapper>
            <div className="Home">
                <main className="main-container">
                    <aside className="info-panel">
                        <div className="location-card">
                            <h1 className={(activeData?.SiteName ? "hasColonyName" : "")}>{activeData?.SiteName || 'Colony Site'}</h1>
                            <h2>
                                <input
                                    type="text"
                                    placeholder="Click Map"
                                    value={inputCoordValue}
                                    onChange={handleInputChange}
                                    onKeyDown={handleInputKeyDown}
                                    onBlur={handleInputBlur}
                                    className="coordinate-input"
                                />
                                <Clipboard copy={coordString} />
                            </h2>
                            <div className="stats-grid">
                                <div className="label">Average Altitude</div>
                                <div className="value">{activeData?.Altitude ? `${activeData.Altitude} m` : '---'}</div>

                                <div className="label">Mean Temperature</div>
                                <div className="value">{activeData?.Temperature ? `${activeData.Temperature}°C` : '---'}</div>

                                <div className="label">Topography</div>
                                <div className="value">{activeData?.Topography || '---'}</div>

                                <div className="label">Challenge</div>
                                <div className="value">{activeData?.Difficulty ? `${activeData.Difficulty}%` : '---'}</div>
                            </div>
                        </div>

                        <div className="analysis-section">
                            <div className="analysis-column">
                                <h3>Threats</h3>
                                <div className="analysis-row">
                                    {renderMeters(Number(activeData?.DustDevilsBars) || 0, 'threat')}
                                    <div className="analysis-name">Dust Devils</div>
                                </div>
                                <div className="analysis-row">
                                    {renderMeters(Number(activeData?.DustStormBars) || 0, 'threat')}
                                    <div className="analysis-name">Dust Storms</div>
                                </div>
                                <div className="analysis-row">
                                    {renderMeters(Number(activeData?.MeteorBars) || 0, 'threat')}
                                    <div className="analysis-name">Meteors</div>
                                </div>
                                <div className="analysis-row">
                                    {renderMeters(Number(activeData?.ColdWaveBars) || 0, 'threat')}
                                    <div className="analysis-name">Cold Waves</div>
                                </div>
                            </div>

                            <div className="analysis-column">
                                <h3>Resources</h3>
                                <div className="analysis-row">
                                    {renderMeters(Number(activeData?.MetalsBars) || 0, 'resource')}
                                    <div className="analysis-name">Metals</div>
                                </div>
                                <div className="analysis-row">
                                    {renderMeters(Number(activeData?.ConcreteBars) || 0, 'resource')}
                                    <div className="analysis-name">Concrete</div>
                                </div>
                                <div className="analysis-row">
                                    {renderMeters(Number(activeData?.WaterBars) || 0, 'resource')}
                                    <div className="analysis-name">Water</div>
                                </div>
                            </div>
                        </div>

                        <div className="map-preview">
                            <img src={getMapImageSrc(activeData?.MapTemplateID)} />
                        </div>
                    </aside>

                    <section className="map-section">
                        <Map coordString={coordString} setCoordString={setCoordString} />
                    </section>
                </main>
            </div>
        </PageWrapper>
    )
}

export default Home