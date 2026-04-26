export const CRYSTAL = '💎';

export function crystals(n: number, emoji: string = CRYSTAL): string {
  return `${n.toLocaleString()} ${emoji}`;
}
