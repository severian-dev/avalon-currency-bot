import type Database from 'better-sqlite3';
import * as lotteryRepo from '../database/repositories/lotteryRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { applyDelta } from './currencyService.js';
import { addHoursIso } from '../utils/time.js';
import { pickWeighted } from '../utils/rng.js';
import type { LotteryRoundRow } from '../database/repositories/lotteryRepo.js';

export function ensureOpenRound(db: Database.Database, guildId: string): LotteryRoundRow {
  let round = lotteryRepo.getOpenRound(db, guildId);
  if (round) return round;

  const config = guildConfigRepo.get(db, guildId);
  const drawsAt = addHoursIso(config.lottery_period_hours);
  const id = lotteryRepo.createRound(db, guildId, drawsAt);
  round = lotteryRepo.getOpenRound(db, guildId);
  if (!round || round.id !== id) {
    throw new Error('failed to create lottery round');
  }
  return round;
}

export interface BuyTicketsResult {
  newBalance: number;
  totalTickets: number;
  pot: number;
  drawsAt: string;
}

export function buyTickets(
  db: Database.Database,
  guildId: string,
  userId: string,
  count: number,
): BuyTicketsResult {
  if (count <= 0) throw new Error('ticket count must be positive');
  const config = guildConfigRepo.get(db, guildId);

  const tx = db.transaction(() => {
    const round = ensureOpenRound(db, guildId);
    const cost = count * config.lottery_ticket_price;
    const newBalance = applyDelta(db, guildId, userId, -cost, 'lottery_buy', String(round.id));
    lotteryRepo.addTickets(db, round.id, userId, count, cost);
    const totalTickets = lotteryRepo.userTickets(db, round.id, userId);
    const updated = lotteryRepo.getOpenRound(db, guildId);
    return {
      newBalance,
      totalTickets,
      pot: updated?.pot ?? round.pot + cost,
      drawsAt: updated?.draws_at ?? round.draws_at,
    };
  });
  return tx();
}

export interface DrawResult {
  roundId: number;
  guildId: string;
  winnerUserId: string | null;
  payout: number;
  pot: number;
  drawChannelId: string | null;
}

export function drawDueRounds(db: Database.Database): DrawResult[] {
  const due = lotteryRepo.listDueRounds(db);
  const results: DrawResult[] = [];

  for (const round of due) {
    if (!lotteryRepo.markDrawing(db, round.id)) continue;

    const tickets = lotteryRepo.listTickets(db, round.id);
    const config = guildConfigRepo.get(db, round.guild_id);

    const tx = db.transaction(() => {
      if (tickets.length === 0) {
        lotteryRepo.markDrawn(db, round.id, null, 0);
        return null;
      }
      const userIds = tickets.map((t) => t.user_id);
      const weights = tickets.map((t) => t.tickets);
      const winner = pickWeighted(userIds, weights);
      applyDelta(db, round.guild_id, winner, round.pot, 'lottery_win', String(round.id));
      lotteryRepo.markDrawn(db, round.id, winner, round.pot);
      return winner;
    });

    const winner = tx();
    results.push({
      roundId: round.id,
      guildId: round.guild_id,
      winnerUserId: winner,
      payout: winner ? round.pot : 0,
      pot: round.pot,
      drawChannelId: config.lottery_draw_channel_id,
    });

    // Open the next round so users can keep buying tickets immediately.
    if (config.lottery_enabled) {
      const drawsAt = addHoursIso(config.lottery_period_hours);
      lotteryRepo.createRound(db, round.guild_id, drawsAt);
    }
  }

  return results;
}
