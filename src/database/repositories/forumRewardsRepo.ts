import type Database from 'better-sqlite3';

export interface ForumRewardRow {
  guild_id: string;
  forum_id: string;
  amount: number;
}

export function set(db: Database.Database, guildId: string, forumId: string, amount: number): void {
  db.prepare(
    `INSERT INTO forum_rewards (guild_id, forum_id, amount) VALUES (?, ?, ?)
     ON CONFLICT(guild_id, forum_id) DO UPDATE SET amount = excluded.amount`,
  ).run(guildId, forumId, amount);
}

export function remove(db: Database.Database, guildId: string, forumId: string): boolean {
  const r = db
    .prepare(`DELETE FROM forum_rewards WHERE guild_id = ? AND forum_id = ?`)
    .run(guildId, forumId);
  return r.changes > 0;
}

export function get(
  db: Database.Database,
  guildId: string,
  forumId: string,
): ForumRewardRow | undefined {
  return db
    .prepare<[string, string], ForumRewardRow>(
      `SELECT * FROM forum_rewards WHERE guild_id = ? AND forum_id = ?`,
    )
    .get(guildId, forumId);
}

export function listForGuild(db: Database.Database, guildId: string): ForumRewardRow[] {
  return db
    .prepare<[string], ForumRewardRow>(`SELECT * FROM forum_rewards WHERE guild_id = ?`)
    .all(guildId);
}

export function hasPaid(db: Database.Database, threadId: string): boolean {
  const r = db
    .prepare<[string], { c: number }>(`SELECT COUNT(*) AS c FROM forum_payouts WHERE thread_id = ?`)
    .get(threadId);
  return (r?.c ?? 0) > 0;
}

export function recordPayout(
  db: Database.Database,
  threadId: string,
  guildId: string,
  userId: string,
  amount: number,
): boolean {
  const r = db
    .prepare(
      `INSERT OR IGNORE INTO forum_payouts (thread_id, guild_id, user_id, amount)
       VALUES (?, ?, ?, ?)`,
    )
    .run(threadId, guildId, userId, amount);
  return r.changes > 0;
}
