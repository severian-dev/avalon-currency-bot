export const CRYSTAL = '💎';

export function crystals(n: number): string {
  return `${n.toLocaleString()} ${CRYSTAL}`;
}
