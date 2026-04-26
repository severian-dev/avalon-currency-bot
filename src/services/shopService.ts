import type Database from 'better-sqlite3';
import * as shopRepo from '../database/repositories/shopRepo.js';
import * as redemptionRepo from '../database/repositories/redemptionRepo.js';
import { applyDelta, InsufficientFundsError } from './currencyService.js';

export class ItemUnavailableError extends Error {
  constructor(reason: 'not_found' | 'inactive' | 'out_of_stock') {
    super(`shop item unavailable: ${reason}`);
    this.name = 'ItemUnavailableError';
  }
}

export interface RedeemResult {
  redemptionId: number;
  itemId: number;
  itemName: string;
  payload: string | null;
  pricePaid: number;
  newBalance: number;
}

export function redeem(
  db: Database.Database,
  guildId: string,
  userId: string,
  itemId: number,
): RedeemResult {
  const tx = db.transaction(() => {
    const item = shopRepo.getById(db, guildId, itemId);
    if (!item) throw new ItemUnavailableError('not_found');
    if (!item.active) throw new ItemUnavailableError('inactive');
    if (item.stock !== null && item.stock <= 0) throw new ItemUnavailableError('out_of_stock');

    if (item.stock !== null) {
      const decremented = shopRepo.decrementStock(db, item.id);
      if (!decremented) throw new ItemUnavailableError('out_of_stock');
    }

    const newBalance = applyDelta(db, guildId, userId, -item.price, 'shop_redeem', String(item.id));

    const redemptionId = redemptionRepo.create(db, guildId, userId, item.id, item.price);

    return {
      redemptionId,
      itemId: item.id,
      itemName: item.name,
      payload: item.payload,
      pricePaid: item.price,
      newBalance,
    };
  });

  try {
    return tx();
  } catch (err) {
    if (err instanceof InsufficientFundsError) throw err;
    throw err;
  }
}

export function refund(
  db: Database.Database,
  guildId: string,
  redemptionId: number,
  resolvedBy: string,
  notes: string | null,
): { userId: string; amount: number; newBalance: number } | null {
  const tx = db.transaction(() => {
    const redemption = redemptionRepo.getById(db, guildId, redemptionId);
    if (!redemption || redemption.status !== 'pending') return null;

    const ok = redemptionRepo.resolve(db, guildId, redemptionId, 'denied', resolvedBy, notes);
    if (!ok) return null;

    shopRepo.incrementStock(db, redemption.item_id);
    const newBalance = applyDelta(
      db,
      guildId,
      redemption.user_id,
      redemption.price_paid,
      'shop_refund',
      String(redemptionId),
      { allowNegativeBalance: true },
    );

    return {
      userId: redemption.user_id,
      amount: redemption.price_paid,
      newBalance,
    };
  });
  return tx();
}

export function fulfill(
  db: Database.Database,
  guildId: string,
  redemptionId: number,
  resolvedBy: string,
  notes: string | null,
): boolean {
  return redemptionRepo.resolve(db, guildId, redemptionId, 'fulfilled', resolvedBy, notes);
}
