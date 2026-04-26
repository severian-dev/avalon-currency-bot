import type Database from 'better-sqlite3';
import * as claimDropRepo from '../database/repositories/claimDropRepo.js';
import * as channelActivityRepo from '../database/repositories/channelActivityRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import type { GuildConfigRow } from '../database/repositories/guildConfigRepo.js';
import { applyDelta } from './currencyService.js';
import { addSecondsIso, diffSeconds, minutesAgoIso } from '../utils/time.js';
import { randomChance, randomInt } from '../utils/rng.js';

export interface DropPlan {
  guildId: string;
  channelId: string;
  amount: number;
  emoji: string | null;
  windowSeconds: number;
}

export function planDropsForTick(db: Database.Database, tickSeconds: number): DropPlan[] {
  const enabledGuilds = db
    .prepare<[], GuildConfigRow>(`SELECT * FROM guild_config WHERE claim_drops_enabled = 1`)
    .all();

  const plans: DropPlan[] = [];
  const now = new Date();

  for (const config of enabledGuilds) {
    const channels = claimDropRepo.listAllowed(db, config.guild_id);
    if (channels.length === 0) continue;

    const adjustedProbability =
      config.claim_drop_probability_per_tick * (tickSeconds / config.claim_drop_tick_seconds);

    for (const channelId of channels) {
      if (claimDropRepo.hasOpenInChannel(db, config.guild_id, channelId)) continue;

      const lastMessageIso = channelActivityRepo.lastMessageAt(db, config.guild_id, channelId);
      if (!lastMessageIso) continue;
      const activeWindowAgoIso = minutesAgoIso(config.claim_drop_active_window_minutes);
      if (lastMessageIso < activeWindowAgoIso) continue;

      const lastDropIso = claimDropRepo.lastCreatedInChannel(db, config.guild_id, channelId);
      if (lastDropIso) {
        const minutesSinceLast = diffSeconds(now.toISOString(), lastDropIso) / 60;
        if (minutesSinceLast < config.claim_drop_min_gap_minutes) continue;
      }

      if (!randomChance(Math.min(adjustedProbability, 1))) continue;

      const amount = randomInt(config.claim_drop_min, config.claim_drop_max);
      plans.push({
        guildId: config.guild_id,
        channelId,
        amount,
        emoji: config.claim_drop_emoji,
        windowSeconds: config.claim_drop_window_seconds,
      });
    }
  }

  return plans;
}

export function recordDropMessage(
  db: Database.Database,
  plan: DropPlan,
  messageId: string,
): number {
  return claimDropRepo.create(db, {
    guildId: plan.guildId,
    channelId: plan.channelId,
    messageId,
    amount: plan.amount,
    expiresAt: addSecondsIso(plan.windowSeconds),
  });
}

export interface ClaimResult {
  amount: number;
  newBalance: number;
}

export function tryClaim(
  db: Database.Database,
  guildId: string,
  messageId: string,
  userId: string,
  reactionEmojiKey: string,
): ClaimResult | null {
  const config = guildConfigRepo.get(db, guildId);
  if (!matchesConfiguredEmoji(reactionEmojiKey, config.claim_drop_emoji)) return null;

  const drop = claimDropRepo.getOpenByMessage(db, messageId);
  if (!drop) return null;
  if (drop.guild_id !== guildId) return null;

  const claimed = claimDropRepo.claimAtomic(db, drop.id, userId);
  if (!claimed) return null;

  const newBalance = applyDelta(db, guildId, userId, drop.amount, 'claim_drop', String(drop.id));
  return { amount: drop.amount, newBalance };
}

export function listExpired(db: Database.Database) {
  return claimDropRepo.listExpiredOpen(db);
}

export function markExpired(db: Database.Database, id: number): void {
  claimDropRepo.markExpired(db, id);
}

export function matchesConfiguredEmoji(reactionKey: string, configured: string | null): boolean {
  if (!configured) return false;
  if (configured === reactionKey) return true;
  // Custom emojis: configured may be "<:name:id>" or "<a:name:id>" - extract the id
  const customMatch = configured.match(/^<a?:[^:]+:(\d+)>$/);
  if (customMatch && customMatch[1] === reactionKey) return true;
  return false;
}
