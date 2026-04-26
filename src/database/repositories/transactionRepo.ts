import type Database from 'better-sqlite3';

export type TxKind =
  | 'grant'
  | 'revoke'
  | 'give'
  | 'daily'
  | 'activity'
  | 'claim_drop'
  | 'forum'
  | 'shop_redeem'
  | 'shop_refund'
  | 'coinflip'
  | 'slots'
  | 'duel'
  | 'lottery_buy'
  | 'lottery_win';

export function record(
  db: Database.Database,
  guildId: string,
  userId: string,
  delta: number,
  kind: TxKind,
  ref?: string | null,
): void {
  db.prepare(
    `INSERT INTO transactions (guild_id, user_id, delta, kind, ref) VALUES (?, ?, ?, ?, ?)`,
  ).run(guildId, userId, delta, kind, ref ?? null);
}

export function earnedTodayByKind(
  db: Database.Database,
  guildId: string,
  userId: string,
  kind: TxKind,
): number {
  const row = db
    .prepare<[string, string, TxKind], { total: number | null }>(
      `SELECT COALESCE(SUM(delta), 0) AS total
       FROM transactions
       WHERE guild_id = ? AND user_id = ? AND kind = ?
         AND date(at) = date('now')`,
    )
    .get(guildId, userId, kind);
  return row?.total ?? 0;
}
