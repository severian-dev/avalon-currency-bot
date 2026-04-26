import type Database from 'better-sqlite3';

export type RedemptionStatus = 'pending' | 'fulfilled' | 'denied';

export interface RedemptionRow {
  id: number;
  guild_id: string;
  user_id: string;
  item_id: number;
  price_paid: number;
  status: RedemptionStatus;
  redeemed_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
}

export function create(
  db: Database.Database,
  guildId: string,
  userId: string,
  itemId: number,
  pricePaid: number,
): number {
  const r = db
    .prepare(
      `INSERT INTO redemptions (guild_id, user_id, item_id, price_paid, status)
       VALUES (?, ?, ?, ?, 'pending')`,
    )
    .run(guildId, userId, itemId, pricePaid);
  return Number(r.lastInsertRowid);
}

export function getById(
  db: Database.Database,
  guildId: string,
  id: number,
): RedemptionRow | undefined {
  return db
    .prepare<[number, string], RedemptionRow>(
      `SELECT * FROM redemptions WHERE id = ? AND guild_id = ?`,
    )
    .get(id, guildId);
}

export function list(
  db: Database.Database,
  guildId: string,
  status?: RedemptionStatus,
  limit: number = 25,
): RedemptionRow[] {
  if (status) {
    return db
      .prepare<[string, RedemptionStatus, number], RedemptionRow>(
        `SELECT * FROM redemptions WHERE guild_id = ? AND status = ? ORDER BY redeemed_at DESC LIMIT ?`,
      )
      .all(guildId, status, limit);
  }
  return db
    .prepare<[string, number], RedemptionRow>(
      `SELECT * FROM redemptions WHERE guild_id = ? ORDER BY redeemed_at DESC LIMIT ?`,
    )
    .all(guildId, limit);
}

export function resolve(
  db: Database.Database,
  guildId: string,
  id: number,
  status: 'fulfilled' | 'denied',
  resolvedBy: string,
  notes?: string | null,
): boolean {
  const r = db
    .prepare(
      `UPDATE redemptions SET status = ?, resolved_at = datetime('now'), resolved_by = ?, notes = ?
       WHERE id = ? AND guild_id = ? AND status = 'pending'`,
    )
    .run(status, resolvedBy, notes ?? null, id, guildId);
  return r.changes > 0;
}
