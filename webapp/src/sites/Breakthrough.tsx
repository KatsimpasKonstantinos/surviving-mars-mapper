import React, { useMemo, useState, useEffect } from 'react';
import type { MapData } from '../types';
import './Breakthrough.css';
import { TechBreakthroughList } from '../helper/TechBreakthroughList';
import { CreateRandFromTrueSeed, StableShuffle } from '../helper/SurvivingMarsRNG';

import { getBreakthroughImageSrc } from '../helper/BreakthroughPreview';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';

interface BreakthroughProps {
  coordString: string | null;
  mapData: MapData;
}

const InvalidTechs = new Set([
  "CaptureAsteroid",
]);

function Breakthrough({ coordString, mapData }: BreakthroughProps) {
  const [activePath, setActivePath] = useState<string[]>([]);

  useEffect(() => {
    setActivePath([]);
  }, [coordString]);


  const tiers = useMemo(() => {
    if (!coordString || !mapData[coordString]) return [];

    const trueSeedStr = mapData[coordString].xxhashShuffleBreakThroughTech;
    if (!trueSeedStr) return [];

    const trueSeed = BigInt(trueSeedStr);

    const shuffleMasterList = (arr: string[]) => {
      const { rand } = CreateRandFromTrueSeed(trueSeed);
      StableShuffle(arr, rand, 100);
    };

    let breakthroughOrder = [...TechBreakthroughList];
    shuffleMasterList(breakthroughOrder);

    const generatedTiers: string[][] = [];

    let available = breakthroughOrder.filter(t => !InvalidTechs.has(t));
    generatedTiers.push(available.slice(0, 3));

    for (let i = 0; i < activePath.length; i++) {
      const pickedTech = activePath[i];

      shuffleMasterList(breakthroughOrder);

      const removeIdx = breakthroughOrder.lastIndexOf(pickedTech);
      if (removeIdx !== -1) {
        breakthroughOrder.splice(removeIdx, 1);
      }

      available = breakthroughOrder.filter(t => !InvalidTechs.has(t));
      generatedTiers.push(available.slice(0, 3));
    }

    return generatedTiers;
  }, [coordString, mapData, activePath]);


  const handleNodeClick = (techId: string, tierIndex: number) => {
    setActivePath(prev => [
      ...prev.slice(0, tierIndex),
      techId
    ]);
  };

  if (!coordString || tiers.length === 0) return (
    <PageWrapper>
      <div className="Breakthrough-select-coordinate">
        Select a coordinate on the <Link to="/">map</Link> to view Breakthroughs
      </div>
    </PageWrapper>
  );

  return (
    <div className="Breakthrough">
      <PageWrapper>
        <div className="breakthrough-header">
          <h1>{coordString}</h1>
          <p><span className="warning">Warning:</span> This Breakthrough predicter may be inaccurate. Especially after the early game, when Planetary Anomalies, Researching Asteroids, Wonders, etc. mix up the Breakthrough pool.</p>

        </div>

        <div className="anomaly-tree-container">
          {tiers.map((tierTechs, tierIndex) => {
            if (tierTechs.length === 0) return null;

            return (
              <React.Fragment key={tierIndex}>

                <div className="tree-tier">
                  <h3 className="tier-title">
                    Choice {tierIndex + 1}
                  </h3>


                  <div className="tech-nodes">
                    {tierTechs.map(tech => (
                      <button
                        key={tech}
                        className={`
                        tech-node
                        ${activePath[tierIndex] === tech ? 'active' : ''}
                        ${activePath.length > tierIndex &&
                            activePath[tierIndex] !== tech
                            ? 'dimmed'
                            : ''
                          }
                        ${tierIndex === tiers.length - 1 && activePath.length === tiers.length
                            ? 'terminal'
                            : ''
                          }
                      `}
                        onClick={() => handleNodeClick(tech, tierIndex)}
                      >
                        <img
                          src={getBreakthroughImageSrc(tech)}
                          alt={`${tech} icon`}
                          className="tech-icon"
                        />
                        <span className="tech-name">{tech}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </PageWrapper>
    </div>
  );
}

export default Breakthrough;