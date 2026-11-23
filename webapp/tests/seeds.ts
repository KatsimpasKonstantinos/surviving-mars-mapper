/** Deterministic pseudo-random signed 64-bit seeds, so test runs are reproducible */
export function* seeds(count: number, start = 0x2545f491n): Generator<bigint> {
  // Edge cases first: zero, -1, the largest and the smallest signed value
  const edges = [0n, -1n, (1n << 63n) - 1n, -(1n << 63n)];
  yield* edges.slice(0, count);
  let x = start;
  for (let i = edges.length; i < count; i++) {
    // xorshift64
    x ^= (x << 13n) & 0xffffffffffffffffn;
    x ^= x >> 7n;
    x ^= (x << 17n) & 0xffffffffffffffffn;
    yield BigInt.asIntN(64, x);
  }
}
