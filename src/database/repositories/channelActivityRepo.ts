import type Database from 'better-sqlite3';

export function touch(
  db: Database.Database,
  guildId: string,
  channelId: string,
  whenIso: string,
): void {
  db.prepare(
    `INSERT INTO channel_activity (guild_id, channel_id, last_message_at)
     VALUES (?, ?, ?)
     ON CONFLICT(guild_id, channel_id) DO UPDATE SET last_message_at = excluded.last_message_at`,
  ).run(guildId, channelId, whenIso);
}

export function lastMessageAt(
  db: Database.Database,
  guildId: string,
  channelId: string,
): string | null {
  const r = db
    .prepare<[string, string], { last_message_at: string }>(
      `SELECT last_message_at FROM channel_activity WHERE guild_id = ? AND channel_id = ?`,
    )
    .get(guildId, channelId);
  return r?.last_message_at ?? null;
}
