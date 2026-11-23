// What each breakthrough does, keyed by tech id (as in TechBreakthroughList).
//
// Source: Surviving Mars Wiki, https://survivingmars.paradoxwikis.com/Breakthrough
// (CC BY-NC-SA 3.0). Icon file names were stripped, obvious typos fixed and notes that
// only apply to the original (pre-Relaunched) game left out.
//
// Data-extraction/log2breakthroughs.py can regenerate this file from the game itself
// (descriptions only, without the notes below).

interface BreakthroughInfo {
  description: string;
  /** Extra details, shown smaller below the description */
  notes?: string[];
}

const BreakthroughDescriptions: Record<string, BreakthroughInfo> = {
  AdvancedDroneDrive: { description: 'Drones move 40% faster.' },
  AlienImprints: {
    description:
      'Uncovers new Anomalies – Alien Artifacts – which provide a Tech cost reduction to all Fields when scanned.',
    notes: ['Generates 3–10 Alien Artifact anomalies.'],
  },
  AncientTerraformingDevice: { description: 'Instantly gain 20% in all Terraforming Parameters.' },
  ArtificialMuscles: {
    description: 'Drones can carry two resources at once.',
    notes: ['If Drones can already carry 2, they can now carry 3 (effectively +1 carry slot).'],
  },
  AutonomousHubs: {
    description: 'Drone Hubs no longer require Power or Maintenance.',
    notes: [
      'Also applies to Drone Hub Extenders.',
      'Starts researched if the commander profile is Inventor.',
    ],
  },
  CaptureAsteroid: {
    description:
      'Landing an Asteroid Lander on an Asteroid captures it in orbit around Mars, which removes the time limit.',
  },
  CargobayOfHolding: { description: 'Reduces the cargo weight of resources by 50%.' },
  Cloning: {
    description:
      'New Spire building: Cloning Vats – creates Clones over time. Cloned Colonists grow and age twice as fast.',
  },
  ConstructionNanites: {
    description:
      'Buildings construct themselves slowly without Drones. Nanites will seek out resources from nearby resource depots.',
    notes: ['Resource depots must be within 30 hexes of the building under construction.'],
  },
  CoreMetals: {
    description: 'Uncover extremely rich underground Metals deposits.',
    notes: ['Generates 2–4 deposits of 50,000 Metals.'],
  },
  CoreRareMetals: {
    description: 'Uncover extremely rich underground Rare Metals deposits.',
    notes: ['Generates 2–4 deposits of 25,000 Rare Metals.'],
  },
  CoreWater: {
    description: 'Uncover extremely rich underground Water deposits.',
    notes: ['Generates 2–4 deposits of 500,000 Water.'],
  },
  CryoSleep: { description: 'Passenger Rockets can carry 20 more Colonists.' },
  DesignedForestation: {
    description: 'Newly grown forests have a chance to spawn Vistas and Research Sites.',
    notes: ['Starts researched if the commander profile is Geo Engineer.'],
  },
  DomeStreamlining: { description: 'Domes cost 50% less basic resources.' },
  DryFarming: {
    description: 'Water requirements of crops are reduced by 50%.',
    notes: ['Also reduces the Water requirements of Open Farm buildings from 10 to 5.'],
  },
  EternalFusion: {
    description:
      'Fusion Reactor upgrade (Eternal Fusion): Fusion Reactors no longer require workers and operate at 150 Performance.',
  },
  ExtractorAI: {
    description:
      'Metals Extractors and Rare Metals Extractors can work without Colonists at 50 Performance.',
  },
  FactoryAutomation: {
    description: 'Factory upgrade (Automation): lowers the number of workers needed in factories.',
  },
  ForeverYoung: { description: 'Seniors can work and have children.' },
  FrictionlessComposites: {
    description: 'Wind Turbine Power production increased by 100%.',
    notes: ['Applies to all wind power buildings.'],
  },
  GemArchitecture: {
    description: 'New Dome: Diamond Dome – a diamond-shaped Dome with space for two Spires.',
  },
  GeneSelection: {
    description: 'Doubles the chance that a Colonist will have or gain a Rare Trait.',
  },
  GiantCrops: {
    description: 'Unlocks giant crops with an increased Food output.',
    notes: [
      'Hydroponic Farms: Giant Leaf Crops, Giant Wheat Grass and Giant Rice.',
      'Farms: Giant Wheat, Giant Potatoes and Giant Corn.',
    ],
  },
  GlobalSupport: {
    description: 'Unlock the unique building and RC vehicle of a random Sponsor.',
    notes: [
      'Repeatable: can be researched multiple times.',
      'The building or vehicle is chosen at random every 5 in-game hours.',
      'Can unlock the Game Developer even if Paradox Interactive is not available as a sponsor.',
    ],
  },
  GoodVibrations: { description: 'Domes restore Sanity to their inhabitants every Sol.' },
  HiveMind: {
    description:
      'Residents of the Arcology get a work performance bonus based on the number of unique Perks and Specializations of the Colonists living there.',
    notes: ['Each Perk and Specialization increases work performance by 1.'],
  },
  HullPolarization: {
    description: 'Buildings require maintenance less often.',
    notes: ['Reduces maintenance by 25%.'],
  },
  HypersensitivePhotovoltaics: {
    description:
      'Power production of Solar Panels, Large Solar Panels and Solar Arrays increased by 100%.',
  },
  InspiringArchitecture: {
    description: 'Colonists in Domes with a Spire have increased Morale.',
    notes: ["Doesn't stack if the Dome has multiple Spires."],
  },
  InterplanetaryLearning: { description: 'Schools can train the Workaholic and Hippie traits.' },
  LakeVaporators: {
    description: 'Lake pumps are self-sufficient and no longer need to be supplied with Water.',
  },
  LandscapingNanites: {
    description:
      'Landscaping projects progress without the need of Drones and are generally faster.',
  },
  MagneticExtraction: {
    description: 'Extractor upgrade (Magnetic Extraction): production increased by 50%.',
  },
  MarsMarketing: {
    description: 'Receive 5 Applicants with Rare Traits.',
    notes: ['Repeatable: can be researched multiple times.'],
  },
  MartianDiet: { description: 'All Colonists consume 25% less Food.' },
  MartianSteel: {
    description: 'Lowers Metals costs for building construction by 25%.',
    notes: ['Also applies to rockets and RC vehicles.'],
  },
  MartianbornIngenuity: { description: 'Martianborn gain 10 Performance.' },
  MolePeople: {
    description:
      'Colonists restore Sanity while sleeping in the Underground instead of losing it. They also gain 10 Morale while they are in the Underground.',
  },
  MultispiralArchitecture: {
    description: 'New Dome: Oval Dome – an elongated Dome with space for two Spires.',
  },
  NanoRefinement: {
    description: 'All Extractors continue to extract small amounts when their deposit is depleted.',
  },
  NeoConcrete: { description: 'Dome Concrete costs reduced by 80%.' },
  NeuralEmpathy: {
    description:
      'Unlocks a Rare Trait – Empath. Empaths raise the Morale of all Colonists in the Dome. The effect stacks with other Empaths.',
    notes: [
      'When researched, 3–5 existing Colonists gain the Empath perk regardless of age group.',
    ],
  },
  NocturnalAdaptation: { description: 'All Colonists gain +20 Performance during night shifts.' },
  OverchargeAmplification: {
    description: 'Amplify upgrades grant a bigger boost to production.',
    notes: ['Amplify upgrades grant an additional 20% boost to production.'],
  },
  PlasmaRocket: {
    description: 'Rocket travel time to and from Earth reduced by 50%.',
    notes: ['Also applies to travel time to asteroids.'],
  },
  PlutoniumSynthesis: {
    description:
      'Stirling Generator upgrade (Plutonium Core): increased Power production while opened.',
  },
  PrefabCompression: {
    description: 'All Spires can be ordered as Prefabs from Earth.',
    notes: ['Cloning Vats cannot be ordered.'],
  },
  PrintedElectronics: {
    description:
      'Drone Prefabs are constructed in the Drone Assembler using Metals instead of Electronics.',
    notes: ['Also applies to Biorobots if they are unlocked.'],
  },
  ProjectPhoenix: {
    description:
      "When a Colonist dies there's a 50% chance they are reconstructed as a Youth with the same Traits.",
  },
  RapidSleep: { description: 'Colonists regain extra Sanity when sleeping.' },
  ResilientVegetation: {
    description:
      'Halves the Water and Temperature requirements of grass, bushes, trees and Open Farm crops.',
  },
  SafeMode: {
    description:
      "When a Colonist suffers a Sanity breakdown, they fall asleep and wake up after 6 hours with 70 Sanity. Colonists can't commit suicide or gain flaws due to a Sanity breakdown.",
  },
  ServiceBots: {
    description:
      'Non-medical Service building upgrade (Service Bots): the building no longer requires workers and operates at 100 Performance.',
    notes: [
      'Available for Art Store, Small Art Store, Diner, Grocer, Small Grocer, Casino Complex, Electronics Store, Spacebar, Small Spacebar, Low-G Amusement Park, Mega Mall, Food Stand, Fast Food Restaurant, Gourmet Restaurant, Panoramic Restaurant and Barista Cafe.',
    ],
  },
  SoylentGreen: {
    description: 'Bodies of dead Colonists are converted to Food.',
    notes: ['The body is replaced by 1 Food, which can be picked up by a Drone.'],
  },
  SpaceRehabilitation: {
    description: 'Colonists have a 50% chance to lose a Flaw on their journey to Mars.',
  },
  SuperconductingComputing: {
    description: 'Converts unused Power into Research Points.',
    notes: [
      'The first 500 unused Power is converted into Research at a ×1.5 ratio.',
      'Each unused Power beyond 500 is converted at a ×0.375 ratio.',
    ],
  },
  Superfungus: {
    description: 'Fungal Farm upgrade (Superfungus): increased production and Oxygen consumption.',
  },
  SuperiorCables: {
    description:
      'Instant and free Power Cable construction. Power Cables do not suffer from Faults.',
  },
  SuperiorPipes: {
    description: 'Instant and free Pipe construction. Pipes do not suffer from Leaks.',
  },
  SustainedWorkload: {
    description: 'Doubles the performance bonus when Colonists are working on a heavy workload.',
  },
  ThePositronicBrain: {
    description:
      "Biorobots can be constructed in the Drone Assembler. Biorobots consume Food and can gain Traits, but can't reproduce and never die of old age.",
  },
  VectorPump: {
    description: 'Moisture Vaporator upgrade (Vector Pump): Water production increased by 100%.',
  },
  'Vocation-Oriented Society': {
    description: 'Colonists gain 10 bonus Performance when all their stats are in the green.',
  },
  WirelessPower: { description: 'Recharge Stations service Drones in a 3-hex range instantly.' },
  ZeroSpaceComputing: {
    description:
      'Research Lab, Hawking Institute and Low-G Lab upgrade (Zero-Space Computing): Research production increased.',
  },
};

export function getBreakthroughInfo(id: string): BreakthroughInfo | undefined {
  return BreakthroughDescriptions[id];
}
