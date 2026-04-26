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

export const SHOP_PAGE_PREFIX = 'shop:page:';

export function buildShopPageId(page: number): string {
  return `${SHOP_PAGE_PREFIX}${page}`;
}

export function parseShopPageId(customId: string): number | null {
  if (!customId.startsWith(SHOP_PAGE_PREFIX)) return null;
  const n = parseInt(customId.slice(SHOP_PAGE_PREFIX.length), 10);
  return Number.isNaN(n) ? null : n;
}
