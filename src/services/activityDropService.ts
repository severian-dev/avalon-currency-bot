import type Database from 'better-sqlite3';
import type { Message } from 'discord.js';
import * as activityRepo from '../database/repositories/activityRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { applyDelta } from './currencyService.js';
import { randomChance, randomInt } from '../utils/rng.js';
import { nowIso, todayBucket, diffSeconds } from '../utils/time.js';

export interface DropResult {
  amount: number;
  emoji: string | null;
}

export function maybeAwardForMessage(
  db: Database.Database,
  message: Message,
): DropResult | null {
  if (message.author.bot) return null;
  if (!message.guild) return null;
  if (!message.content || message.content.length === 0) return null;

  const guildId = message.guild.id;
  const userId = message.author.id;

  const config = guildConfigRepo.get(db, guildId);
  if (!config.activity_enabled) return null;

  if (!activityRepo.isAllowed(db, guildId, message.channelId)) return null;

  const cooldown = activityRepo.getCooldown(db, guildId, userId);
  const now = new Date();
  const today = todayBucket();

  if (cooldown?.last_drop_at) {
    const elapsed = diffSeconds(now.toISOString(), cooldown.last_drop_at);
    if (elapsed < config.activity_drop_cooldown_seconds) return null;
  }

  if (cooldown && cooldown.earned_day === today && cooldown.earned_today >= config.activity_drop_daily_cap) {
    return null;
  }

  if (!randomChance(config.activity_drop_chance)) return null;

  const amount = randomInt(config.activity_drop_min, config.activity_drop_max);

  applyDelta(db, guildId, userId, amount, 'activity', message.id);
  activityRepo.recordDrop(db, guildId, userId, amount, today, nowIso());

  return { amount, emoji: config.activity_drop_emoji };
}
