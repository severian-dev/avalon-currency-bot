import type { Client } from 'discord.js';
import type Database from 'better-sqlite3';
import { startClaimDropScheduler } from './claimDropScheduler.js';
import { startLotteryScheduler } from './lotteryScheduler.js';

export function startSchedulers(client: Client, db: Database.Database): void {
  startClaimDropScheduler(client, db);
  startLotteryScheduler(client, db);
}
