// 1. The 64-bit PRNG Math Engine
export function BraidRandom(seed: bigint): bigint {
    const MAGIC_1 = 0x9e3779b97f4a7c15n;
    const MAGIC_2 = 0xbf58476d1ce4e5b9n;
    const MAGIC_3 = 0x94d049bb133111ebn;
    const toUint64 = (val: bigint) => BigInt.asUintN(64, val);

    let uSeed = toUint64(seed);
    let seed_mix = toUint64(uSeed + MAGIC_1);
    let part_one = toUint64((seed_mix ^ toUint64(seed_mix >> 30n)) * MAGIC_2);
    let part_two = toUint64((part_one ^ toUint64(part_one >> 27n)) * MAGIC_3);
    
    let result_unsigned = toUint64(part_two ^ toUint64(part_two >> 31n));
    return BigInt.asIntN(64, result_unsigned);
}

export function CreateRandFromTrueSeed(trueSeed: bigint) {
    let currentSeed = trueSeed;

    const rand = (max: number): number => {
        currentSeed = BraidRandom(currentSeed);
        const unsignedVal = BigInt.asUintN(64, currentSeed);
        return Number(unsignedVal % BigInt(max));
    };

    return { rand };
}

export function StableShuffle<T>(tbl: T[], randFunc: (max: number) => number, max: number): void {
    let tmp: T[] = [];
    while (tbl.length > 1) {
        let idx = randFunc(max); // 0-indexed random pick
        if (idx < tbl.length) {
            tmp.push(tbl[idx]);
            tbl.splice(idx, 1);
        }
    }
    for (let i = tmp.length - 1; i >= 0; i--) {
        tbl.push(tmp[i]);
    }
}