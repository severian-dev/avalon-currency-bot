export const DUEL_ACCEPT = 'duel:accept';
export const DUEL_DECLINE = 'duel:decline';

export function buildDuelButtonId(prefix: string, duelKey: string): string {
  return `${prefix}:${duelKey}`;
}

export function parseDuelButtonId(customId: string): { prefix: string; duelKey: string } | null {
  const [a, b, c] = customId.split(':');
  if (!a || !b || !c) return null;
  return { prefix: `${a}:${b}`, duelKey: c };
}
