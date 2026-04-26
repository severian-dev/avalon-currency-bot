export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomChance(probability: number): boolean {
  return Math.random() < probability;
}

export function pickWeighted<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length || items.length === 0) {
    throw new Error('pickWeighted: items and weights must be non-empty and same length');
  }
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}
