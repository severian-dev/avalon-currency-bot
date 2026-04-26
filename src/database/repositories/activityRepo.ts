import type Database from 'better-sqlite3';

export function isAllowed(db: Database.Database, guildId: string, channelId: string): boolean {
  const r = db
    .prepare<[string, string], { c: number }>(
      `SELECT COUNT(*) AS c FROM activity_channels WHERE guild_id = ? AND channel_id = ?`,
    )
    .get(guildId, channelId);
  return (r?.c ?? 0) > 0;
}

export function listAllowed(db: Database.Database, guildId: string): string[] {
  return db
    .prepare<[string], { channel_id: string }>(
      `SELECT channel_id FROM activity_channels WHERE guild_id = ?`,
    )
    .all(guildId)
    .map((r) => r.channel_id);
}

export function addAllowed(db: Database.Database, guildId: string, channelId: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO activity_channels (guild_id, channel_id) VALUES (?, ?)`,
  ).run(guildId, channelId);
}

export function removeAllowed(
  db: Database.Database,
  guildId: string,
  channelId: string,
): boolean {
  const r = db
    .prepare(`DELETE FROM activity_channels WHERE guild_id = ? AND channel_id = ?`)
    .run(guildId, channelId);
  return r.changes > 0;
}

export interface CooldownRow {
  guild_id: string;
  user_id: string;
  last_drop_at: string | null;
  earned_today: number;
  earned_day: string | null;
}

export function getCooldown(
  db: Database.Database,
  guildId: string,
  userId: string,
): CooldownRow | undefined {
  return db
    .prepare<[string, string], CooldownRow>(
      `SELECT * FROM activity_cooldowns WHERE guild_id = ? AND user_id = ?`,
    )
    .get(guildId, userId);
}

export function recordDrop(
  db: Database.Database,
  guildId: string,
  userId: string,
  amount: number,
  todayBucket: string,
  nowIso: string,
): void {
  const existing = getCooldown(db, guildId, userId);
  if (!existing) {
    db.prepare(
      `INSERT INTO activity_cooldowns (guild_id, user_id, last_drop_at, earned_today, earned_day)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(guildId, userId, nowIso, amount, todayBucket);
    return;
  }
  const earnedToday = existing.earned_day === todayBucket ? existing.earned_today + amount : amount;
  db.prepare(
    `UPDATE activity_cooldowns SET last_drop_at = ?, earned_today = ?, earned_day = ?
     WHERE guild_id = ? AND user_id = ?`,
  ).run(nowIso, earnedToday, todayBucket, guildId, userId);
}
