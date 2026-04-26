import type Database from 'better-sqlite3';
import * as userRepo from '../database/repositories/userRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { applyDelta } from './currencyService.js';
import { randomInt } from '../utils/rng.js';
import { nowIso } from '../utils/time.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyResult {
  amount: number;
  baseAmount: number;
  streakBonus: number;
  newStreak: number;
  newBalance: number;
}

export class DailyOnCooldownError extends Error {
  constructor(public readonly nextAvailableAt: Date) {
    super('Daily already claimed');
    this.name = 'DailyOnCooldownError';
  }
}

export function claimDaily(
  db: Database.Database,
  guildId: string,
  userId: string,
): DailyResult {
  const config = guildConfigRepo.get(db, guildId);

  const tx = db.transaction(() => {
    userRepo.ensure(db, guildId, userId);
    const user = userRepo.get(db, guildId, userId);
    const now = new Date();

    if (user?.last_daily_at) {
      const last = new Date(user.last_daily_at).getTime();
      const nextAt = new Date(last + DAY_MS);
      if (now.getTime() < nextAt.getTime()) {
        throw new DailyOnCooldownError(nextAt);
      }
    }

    let newStreak: number;
    if (!user?.last_daily_at) {
      newStreak = 1;
    } else {
      const last = new Date(user.last_daily_at).getTime();
      const elapsed = now.getTime() - last;
      newStreak = elapsed <= 2 * DAY_MS ? user.daily_streak + 1 : 1;
    }

    const baseAmount = randomInt(config.daily_min, config.daily_max);
    const cappedStreak = Math.min(newStreak, config.daily_streak_cap);
    const streakBonus = (cappedStreak - 1) * config.daily_streak_bonus;
    const amount = baseAmount + streakBonus;

    const newBalance = applyDelta(db, guildId, userId, amount, 'daily');
    userRepo.setDailyClaim(db, guildId, userId, newStreak, nowIso());

    return { amount, baseAmount, streakBonus, newStreak, newBalance };
  });
  return tx();
}
