import type Database from 'better-sqlite3';

export interface UserRow {
  guild_id: string;
  user_id: string;
  balance: number;
  last_daily_at: string | null;
  daily_streak: number;
}

export function ensure(db: Database.Database, guildId: string, userId: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO users (guild_id, user_id, balance) VALUES (?, ?, 0)`,
  ).run(guildId, userId);
}

export function get(db: Database.Database, guildId: string, userId: string): UserRow | undefined {
  return db
    .prepare<[string, string], UserRow>(`SELECT * FROM users WHERE guild_id = ? AND user_id = ?`)
    .get(guildId, userId);
}

export function getBalance(db: Database.Database, guildId: string, userId: string): number {
  const row = db
    .prepare<[string, string], { balance: number }>(
      `SELECT balance FROM users WHERE guild_id = ? AND user_id = ?`,
    )
    .get(guildId, userId);
  return row?.balance ?? 0;
}

export function adjustBalance(
  db: Database.Database,
  guildId: string,
  userId: string,
  delta: number,
): number {
  ensure(db, guildId, userId);
  const result = db
    .prepare<[number, string, string], { balance: number }>(
      `UPDATE users SET balance = balance + ? WHERE guild_id = ? AND user_id = ? RETURNING balance`,
    )
    .get(delta, guildId, userId);
  if (!result) throw new Error('adjustBalance: user row missing after ensure');
  return result.balance;
}

export function setDailyClaim(
  db: Database.Database,
  guildId: string,
  userId: string,
  newStreak: number,
  whenIso: string,
): void {
  db.prepare(
    `UPDATE users SET last_daily_at = ?, daily_streak = ? WHERE guild_id = ? AND user_id = ?`,
  ).run(whenIso, newStreak, guildId, userId);
}

export function leaderboard(
  db: Database.Database,
  guildId: string,
  limit: number,
): UserRow[] {
  return db
    .prepare<[string, number], UserRow>(
      `SELECT * FROM users WHERE guild_id = ? AND balance > 0 ORDER BY balance DESC LIMIT ?`,
    )
    .all(guildId, limit);
}
