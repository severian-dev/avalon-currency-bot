import type Database from 'better-sqlite3';

export interface ShopItemRow {
  id: number;
  guild_id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  payload: string | null;
  emoji: string | null;
  active: number;
  created_by: string | null;
  created_at: string;
}

export function add(
  db: Database.Database,
  guildId: string,
  fields: {
    name: string;
    price: number;
    description?: string | null;
    stock?: number | null;
    payload?: string | null;
    emoji?: string | null;
    createdBy?: string;
  },
): number {
  const result = db
    .prepare(
      `INSERT INTO shop_items (guild_id, name, description, price, stock, payload, emoji, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      guildId,
      fields.name,
      fields.description ?? null,
      fields.price,
      fields.stock ?? null,
      fields.payload ?? null,
      fields.emoji ?? null,
      fields.createdBy ?? null,
    );
  return Number(result.lastInsertRowid);
}

export function getById(
  db: Database.Database,
  guildId: string,
  id: number,
): ShopItemRow | undefined {
  return db
    .prepare<[number, string], ShopItemRow>(
      `SELECT * FROM shop_items WHERE id = ? AND guild_id = ?`,
    )
    .get(id, guildId);
}

export function listActive(db: Database.Database, guildId: string): ShopItemRow[] {
  return db
    .prepare<[string], ShopItemRow>(
      `SELECT * FROM shop_items WHERE guild_id = ? AND active = 1 ORDER BY price ASC, id ASC`,
    )
    .all(guildId);
}

export function listActivePage(
  db: Database.Database,
  guildId: string,
  offset: number,
  limit: number,
): ShopItemRow[] {
  return db
    .prepare<[string, number, number], ShopItemRow>(
      `SELECT * FROM shop_items WHERE guild_id = ? AND active = 1 ORDER BY price ASC, id ASC LIMIT ? OFFSET ?`,
    )
    .all(guildId, limit, offset);
}

export function countActive(db: Database.Database, guildId: string): number {
  const r = db
    .prepare<[string], { c: number }>(
      `SELECT COUNT(*) AS c FROM shop_items WHERE guild_id = ? AND active = 1`,
    )
    .get(guildId);
  return r?.c ?? 0;
}

export function searchActive(
  db: Database.Database,
  guildId: string,
  query: string,
  limit: number = 25,
): ShopItemRow[] {
  return db
    .prepare<[string, string, number], ShopItemRow>(
      `SELECT * FROM shop_items WHERE guild_id = ? AND active = 1 AND name LIKE ? ORDER BY price ASC LIMIT ?`,
    )
    .all(guildId, `%${query}%`, limit);
}

export function update(
  db: Database.Database,
  guildId: string,
  id: number,
  field: 'name' | 'description' | 'price' | 'stock' | 'payload' | 'emoji' | 'active',
  value: string | number | null,
): void {
  db.prepare(`UPDATE shop_items SET ${field} = ? WHERE id = ? AND guild_id = ?`).run(
    value,
    id,
    guildId,
  );
}

export function decrementStock(db: Database.Database, id: number): boolean {
  const r = db
    .prepare(
      `UPDATE shop_items SET stock = stock - 1 WHERE id = ? AND stock IS NOT NULL AND stock > 0`,
    )
    .run(id);
  return r.changes > 0;
}

export function incrementStock(db: Database.Database, id: number): void {
  db.prepare(`UPDATE shop_items SET stock = stock + 1 WHERE id = ? AND stock IS NOT NULL`).run(id);
}
