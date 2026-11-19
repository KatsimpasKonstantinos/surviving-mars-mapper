import { TechBreakthroughList } from './TechBreakthroughList.ts';
import { CreateRandFromTrueSeed, StableShuffle } from './SurvivingMarsRNG.ts';

/** Breakthroughs the game never offers as a regular choice. */
export const InvalidTechs = new Set(['CaptureAsteroid']);

export const CHOICES_PER_TIER = 3;

/**
 * Re-creates the game's breakthrough shuffle for a site.
 *
 * Returns one tier per decision: tier 0 is the first set of choices, and each
 * entry in `path` (the breakthrough picked from the previous tier) adds the
 * next tier.
 */
export function computeBreakthroughTiers(
  trueSeed: bigint,
  path: readonly string[] = [],
): string[][] {
  const shuffleMasterList = (arr: string[]) => {
    const { rand } = CreateRandFromTrueSeed(trueSeed);
    StableShuffle(arr, rand, 100);
  };

  const breakthroughOrder = [...TechBreakthroughList];
  shuffleMasterList(breakthroughOrder);

  const tiers: string[][] = [];
  let available = breakthroughOrder.filter((t) => !InvalidTechs.has(t));
  tiers.push(available.slice(0, CHOICES_PER_TIER));

  for (const pickedTech of path) {
    shuffleMasterList(breakthroughOrder);

    const removeIdx = breakthroughOrder.lastIndexOf(pickedTech);
    if (removeIdx !== -1) {
      breakthroughOrder.splice(removeIdx, 1);
    }

    available = breakthroughOrder.filter((t) => !InvalidTechs.has(t));
    tiers.push(available.slice(0, CHOICES_PER_TIER));
  }

  return tiers;
}

/** "ThePositronicBrain" -> "The Positronic Brain", "ExtractorAI" -> "Extractor AI" */
export function formatBreakthroughName(id: string): string {
  return id.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}
