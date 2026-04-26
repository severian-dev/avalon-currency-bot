import type Database from 'better-sqlite3';

export interface GuildConfigRow {
  guild_id: string;
  redemption_channel_id: string | null;
  give_role_id: string | null;

  daily_min: number;
  daily_max: number;
  daily_streak_bonus: number;
  daily_streak_cap: number;

  activity_enabled: number;
  activity_drop_chance: number;
  activity_drop_min: number;
  activity_drop_max: number;
  activity_drop_cooldown_seconds: number;
  activity_drop_daily_cap: number;
  activity_drop_emoji: string | null;

  claim_drops_enabled: number;
  claim_drop_min: number;
  claim_drop_max: number;
  claim_drop_window_seconds: number;
  claim_drop_active_window_minutes: number;
  claim_drop_probability_per_tick: number;
  claim_drop_tick_seconds: number;
  claim_drop_emoji: string | null;
  claim_drop_min_gap_minutes: number;

  bet_min: number;
  bet_max: number;
  slots_house_edge_bps: number;
  duel_announce_channel_id: string | null;

  lottery_enabled: number;
  lottery_ticket_price: number;
  lottery_draw_channel_id: string | null;
  lottery_period_hours: number;
}

export const ALLOWED_KEYS = [
  'redemption_channel_id',
  'give_role_id',
  'daily_min',
  'daily_max',
  'daily_streak_bonus',
  'daily_streak_cap',
  'activity_enabled',
  'activity_drop_chance',
  'activity_drop_min',
  'activity_drop_max',
  'activity_drop_cooldown_seconds',
  'activity_drop_daily_cap',
  'activity_drop_emoji',
  'claim_drops_enabled',
  'claim_drop_min',
  'claim_drop_max',
  'claim_drop_window_seconds',
  'claim_drop_active_window_minutes',
  'claim_drop_probability_per_tick',
  'claim_drop_tick_seconds',
  'claim_drop_emoji',
  'claim_drop_min_gap_minutes',
  'bet_min',
  'bet_max',
  'slots_house_edge_bps',
  'duel_announce_channel_id',
  'lottery_enabled',
  'lottery_ticket_price',
  'lottery_draw_channel_id',
  'lottery_period_hours',
] as const;

export type ConfigKey = (typeof ALLOWED_KEYS)[number];

export function ensure(db: Database.Database, guildId: string): void {
  db.prepare(`INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)`).run(guildId);
}

export function get(db: Database.Database, guildId: string): GuildConfigRow {
  ensure(db, guildId);
  const row = db
    .prepare<[string], GuildConfigRow>(`SELECT * FROM guild_config WHERE guild_id = ?`)
    .get(guildId);
  if (!row) throw new Error('guild_config row missing after ensure');
  return row;
}

export function set(
  db: Database.Database,
  guildId: string,
  key: ConfigKey,
  value: string | number | null,
): void {
  ensure(db, guildId);
  db.prepare(`UPDATE guild_config SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
}

export function listAllEnabled(db: Database.Database): GuildConfigRow[] {
  return db
    .prepare<[], GuildConfigRow>(
      `SELECT * FROM guild_config WHERE claim_drops_enabled = 1 OR lottery_enabled = 1`,
    )
    .all();
}
