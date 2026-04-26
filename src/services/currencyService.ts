import type Database from 'better-sqlite3';
import * as userRepo from '../database/repositories/userRepo.js';
import * as txRepo from '../database/repositories/transactionRepo.js';
import type { TxKind } from '../database/repositories/transactionRepo.js';

export class InsufficientFundsError extends Error {
  constructor(public readonly balance: number, public readonly required: number) {
    super(`Insufficient funds: have ${balance}, need ${required}`);
    this.name = 'InsufficientFundsError';
  }
}

export interface DeltaOptions {
  /** When false (default), negative deltas require the user has enough balance. Set true for /grant-style mints/burns regardless of balance. */
  allowNegativeBalance?: boolean;
}

export function applyDelta(
  db: Database.Database,
  guildId: string,
  userId: string,
  delta: number,
  kind: TxKind,
  ref?: string | null,
  options: DeltaOptions = {},
): number {
  const tx = db.transaction(() => {
    userRepo.ensure(db, guildId, userId);
    if (delta < 0 && !options.allowNegativeBalance) {
      const current = userRepo.getBalance(db, guildId, userId);
      if (current + delta < 0) {
        throw new InsufficientFundsError(current, -delta);
      }
    }
    const newBalance = userRepo.adjustBalance(db, guildId, userId, delta);
    txRepo.record(db, guildId, userId, delta, kind, ref ?? null);
    return newBalance;
  });
  return tx();
}

export function transfer(
  db: Database.Database,
  guildId: string,
  fromUserId: string,
  toUserId: string,
  amount: number,
  kind: TxKind,
  ref?: string | null,
): { fromBalance: number; toBalance: number } {
  if (amount <= 0) throw new Error('transfer amount must be positive');
  if (fromUserId === toUserId) throw new Error('cannot transfer to self');

  const tx = db.transaction(() => {
    userRepo.ensure(db, guildId, fromUserId);
    userRepo.ensure(db, guildId, toUserId);
    const fromCurrent = userRepo.getBalance(db, guildId, fromUserId);
    if (fromCurrent < amount) {
      throw new InsufficientFundsError(fromCurrent, amount);
    }
    const fromBalance = userRepo.adjustBalance(db, guildId, fromUserId, -amount);
    const toBalance = userRepo.adjustBalance(db, guildId, toUserId, amount);
    txRepo.record(db, guildId, fromUserId, -amount, kind, ref ?? null);
    txRepo.record(db, guildId, toUserId, amount, kind, ref ?? null);
    return { fromBalance, toBalance };
  });
  return tx();
}
