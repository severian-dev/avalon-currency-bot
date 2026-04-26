import type Database from 'better-sqlite3';

export type LotteryStatus = 'open' | 'drawing' | 'drawn';

export interface LotteryRoundRow {
  id: number;
  guild_id: string;
  status: LotteryStatus;
  pot: number;
  draws_at: string;
  drawn_at: string | null;
  winner_user_id: string | null;
  winner_payout: number | null;
}

export interface LotteryTicketRow {
  round_id: number;
  user_id: string;
  tickets: number;
}

export function getOpenRound(
  db: Database.Database,
  guildId: string,
): LotteryRoundRow | undefined {
  return db
    .prepare<[string], LotteryRoundRow>(
      `SELECT * FROM lottery_rounds WHERE guild_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`,
    )
    .get(guildId);
}

export function createRound(
  db: Database.Database,
  guildId: string,
  drawsAtIso: string,
): number {
  const r = db
    .prepare(
      `INSERT INTO lottery_rounds (guild_id, status, pot, draws_at) VALUES (?, 'open', 0, ?)`,
    )
    .run(guildId, drawsAtIso);
  return Number(r.lastInsertRowid);
}

export function addTickets(
  db: Database.Database,
  roundId: number,
  userId: string,
  count: number,
  cost: number,
): void {
  db.prepare(
    `INSERT INTO lottery_tickets (round_id, user_id, tickets) VALUES (?, ?, ?)
     ON CONFLICT(round_id, user_id) DO UPDATE SET tickets = tickets + excluded.tickets`,
  ).run(roundId, userId, count);
  db.prepare(`UPDATE lottery_rounds SET pot = pot + ? WHERE id = ?`).run(cost, roundId);
}

export function listTickets(db: Database.Database, roundId: number): LotteryTicketRow[] {
  return db
    .prepare<[number], LotteryTicketRow>(
      `SELECT * FROM lottery_tickets WHERE round_id = ? AND tickets > 0`,
    )
    .all(roundId);
}

export function userTickets(
  db: Database.Database,
  roundId: number,
  userId: string,
): number {
  const r = db
    .prepare<[number, string], { tickets: number }>(
      `SELECT tickets FROM lottery_tickets WHERE round_id = ? AND user_id = ?`,
    )
    .get(roundId, userId);
  return r?.tickets ?? 0;
}

export function listDueRounds(db: Database.Database): LotteryRoundRow[] {
  return db
    .prepare<[], LotteryRoundRow>(
      `SELECT * FROM lottery_rounds WHERE status = 'open' AND draws_at <= datetime('now')`,
    )
    .all();
}

export function markDrawing(db: Database.Database, id: number): boolean {
  const r = db
    .prepare(`UPDATE lottery_rounds SET status = 'drawing' WHERE id = ? AND status = 'open'`)
    .run(id);
  return r.changes > 0;
}

export function markDrawn(
  db: Database.Database,
  id: number,
  winnerUserId: string | null,
  payout: number,
): void {
  db.prepare(
    `UPDATE lottery_rounds SET status = 'drawn', drawn_at = datetime('now'),
       winner_user_id = ?, winner_payout = ? WHERE id = ?`,
  ).run(winnerUserId, payout, id);
}
