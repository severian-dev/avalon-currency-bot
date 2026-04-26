import type Database from 'better-sqlite3';

export type ClaimDropStatus = 'open' | 'claimed' | 'expired';

export interface ClaimDropRow {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string;
  amount: number;
  status: ClaimDropStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  expires_at: string;
  created_at: string;
}

export function listAllowed(db: Database.Database, guildId: string): string[] {
  return db
    .prepare<[string], { channel_id: string }>(
      `SELECT channel_id FROM claim_drop_channels WHERE guild_id = ?`,
    )
    .all(guildId)
    .map((r) => r.channel_id);
}

export function addAllowed(db: Database.Database, guildId: string, channelId: string): void {
  db.prepare(
    `INSERT OR IGNORE INTO claim_drop_channels (guild_id, channel_id) VALUES (?, ?)`,
  ).run(guildId, channelId);
}

export function removeAllowed(
  db: Database.Database,
  guildId: string,
  channelId: string,
): boolean {
  const r = db
    .prepare(`DELETE FROM claim_drop_channels WHERE guild_id = ? AND channel_id = ?`)
    .run(guildId, channelId);
  return r.changes > 0;
}

export function create(
  db: Database.Database,
  fields: {
    guildId: string;
    channelId: string;
    messageId: string;
    amount: number;
    expiresAt: string;
  },
): number {
  const r = db
    .prepare(
      `INSERT INTO claim_drops (guild_id, channel_id, message_id, amount, status, expires_at)
       VALUES (?, ?, ?, ?, 'open', ?)`,
    )
    .run(fields.guildId, fields.channelId, fields.messageId, fields.amount, fields.expiresAt);
  return Number(r.lastInsertRowid);
}

export function getOpenByMessage(
  db: Database.Database,
  messageId: string,
): ClaimDropRow | undefined {
  return db
    .prepare<[string], ClaimDropRow>(
      `SELECT * FROM claim_drops WHERE message_id = ? AND status = 'open'`,
    )
    .get(messageId);
}

export function hasOpenInChannel(
  db: Database.Database,
  guildId: string,
  channelId: string,
): boolean {
  const r = db
    .prepare<[string, string], { c: number }>(
      `SELECT COUNT(*) AS c FROM claim_drops
       WHERE guild_id = ? AND channel_id = ? AND status = 'open'`,
    )
    .get(guildId, channelId);
  return (r?.c ?? 0) > 0;
}

export function lastCreatedInChannel(
  db: Database.Database,
  guildId: string,
  channelId: string,
): string | null {
  const r = db
    .prepare<[string, string], { created_at: string }>(
      `SELECT created_at FROM claim_drops
       WHERE guild_id = ? AND channel_id = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(guildId, channelId);
  return r?.created_at ?? null;
}

export function claimAtomic(
  db: Database.Database,
  id: number,
  userId: string,
): boolean {
  const r = db
    .prepare(
      `UPDATE claim_drops SET status = 'claimed', claimed_by = ?, claimed_at = datetime('now')
       WHERE id = ? AND status = 'open'`,
    )
    .run(userId, id);
  return r.changes > 0;
}

export function listExpiredOpen(db: Database.Database): ClaimDropRow[] {
  return db
    .prepare<[], ClaimDropRow>(
      `SELECT * FROM claim_drops WHERE status = 'open' AND expires_at <= datetime('now')`,
    )
    .all();
}

export function markExpired(db: Database.Database, id: number): void {
  db.prepare(`UPDATE claim_drops SET status = 'expired' WHERE id = ? AND status = 'open'`).run(id);
}
