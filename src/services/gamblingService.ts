import type Database from 'better-sqlite3';
import { applyDelta } from './currencyService.js';
import { pickWeighted } from '../utils/rng.js';

export interface CoinflipResult {
  win: boolean;
  delta: number;
  newBalance: number;
  outcome: 'heads' | 'tails';
}

export function coinflip(
  db: Database.Database,
  guildId: string,
  userId: string,
  stake: number,
  guess: 'heads' | 'tails',
): CoinflipResult {
  const outcome: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
  const win = outcome === guess;
  const delta = win ? stake : -stake;
  const newBalance = applyDelta(db, guildId, userId, delta, 'coinflip');
  return { win, delta, newBalance, outcome };
}

export const SLOT_SYMBOLS = ['🍒', '🍋', '💎', '⭐', '🌙'] as const;
const SLOT_WEIGHTS = [30, 25, 22, 15, 8];
const THREE_OF_A_KIND_PAYOUTS: Record<string, number> = {
  '🍒': 3,
  '🍋': 6,
  '💎': 10,
  '⭐': 20,
  '🌙': 50,
};
const TWO_ADJACENT_PAYOUT = 1.7;

export interface SlotsResult {
  reels: [string, string, string];
  multiplier: number;
  delta: number;
  newBalance: number;
}

export function slots(
  db: Database.Database,
  guildId: string,
  userId: string,
  stake: number,
): SlotsResult {
  const reel = (): string => pickWeighted([...SLOT_SYMBOLS], SLOT_WEIGHTS);
  const reels: [string, string, string] = [reel(), reel(), reel()];

  let multiplier = 0;
  if (reels[0] === reels[1] && reels[1] === reels[2]) {
    multiplier = THREE_OF_A_KIND_PAYOUTS[reels[0]] ?? 0;
  } else if (reels[0] === reels[1] || reels[1] === reels[2]) {
    multiplier = TWO_ADJACENT_PAYOUT;
  }

  const winnings = Math.floor(stake * multiplier);
  const delta = winnings - stake;
  const newBalance = applyDelta(db, guildId, userId, delta, 'slots');

  return { reels, multiplier, delta, newBalance };
}

export function resolveDuel(
  db: Database.Database,
  guildId: string,
  challengerId: string,
  opponentId: string,
  stake: number,
): { winnerId: string; loserId: string; winnerNewBalance: number; loserNewBalance: number } {
  const winnerIsChallenger = Math.random() < 0.5;
  const winnerId = winnerIsChallenger ? challengerId : opponentId;
  const loserId = winnerIsChallenger ? opponentId : challengerId;

  const tx = db.transaction(() => {
    const loserNewBalance = applyDelta(db, guildId, loserId, -stake, 'duel');
    const winnerNewBalance = applyDelta(db, guildId, winnerId, stake, 'duel');
    return { winnerId, loserId, winnerNewBalance, loserNewBalance };
  });
  return tx();
}
