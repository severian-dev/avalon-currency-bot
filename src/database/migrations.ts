import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      guild_id      TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      balance       INTEGER NOT NULL DEFAULT 0,
      last_daily_at TEXT,
      daily_streak  INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id  TEXT NOT NULL,
      user_id   TEXT NOT NULL,
      delta     INTEGER NOT NULL,
      kind      TEXT NOT NULL,
      ref       TEXT,
      at        TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_guild_user_at
      ON transactions(guild_id, user_id, at DESC);

    CREATE TABLE IF NOT EXISTS shop_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id    TEXT NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      price       INTEGER NOT NULL,
      stock       INTEGER,
      payload     TEXT,
      active      INTEGER NOT NULL DEFAULT 1,
      created_by  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_shop_items_guild_active
      ON shop_items(guild_id, active);

    CREATE TABLE IF NOT EXISTS redemptions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id    TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      item_id     INTEGER NOT NULL REFERENCES shop_items(id),
      price_paid  INTEGER NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('pending', 'fulfilled', 'denied')),
      redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
      resolved_at TEXT,
      resolved_by TEXT,
      notes       TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_redemptions_guild_status
      ON redemptions(guild_id, status, redeemed_at);

    CREATE TABLE IF NOT EXISTS forum_rewards (
      guild_id TEXT NOT NULL,
      forum_id TEXT NOT NULL,
      amount   INTEGER NOT NULL,
      PRIMARY KEY (guild_id, forum_id)
    );

    CREATE TABLE IF NOT EXISTS forum_payouts (
      thread_id TEXT PRIMARY KEY,
      guild_id  TEXT NOT NULL,
      user_id   TEXT NOT NULL,
      amount    INTEGER NOT NULL,
      paid_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_channels (
      guild_id   TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS activity_cooldowns (
      guild_id      TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      last_drop_at  TEXT,
      earned_today  INTEGER NOT NULL DEFAULT 0,
      earned_day    TEXT,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS claim_drop_channels (
      guild_id   TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS claim_drops (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id    TEXT NOT NULL,
      channel_id  TEXT NOT NULL,
      message_id  TEXT NOT NULL,
      amount      INTEGER NOT NULL,
      status      TEXT NOT NULL CHECK(status IN ('open', 'claimed', 'expired')),
      claimed_by  TEXT,
      claimed_at  TEXT,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_claim_drops_status_expires
      ON claim_drops(status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_claim_drops_guild_channel_created
      ON claim_drops(guild_id, channel_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS channel_activity (
      guild_id        TEXT NOT NULL,
      channel_id      TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      PRIMARY KEY (guild_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS lottery_rounds (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id       TEXT NOT NULL,
      status         TEXT NOT NULL CHECK(status IN ('open', 'drawing', 'drawn')),
      pot            INTEGER NOT NULL DEFAULT 0,
      draws_at       TEXT NOT NULL,
      drawn_at       TEXT,
      winner_user_id TEXT,
      winner_payout  INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_lottery_rounds_guild_status
      ON lottery_rounds(guild_id, status);

    CREATE TABLE IF NOT EXISTS lottery_tickets (
      round_id INTEGER NOT NULL REFERENCES lottery_rounds(id),
      user_id  TEXT NOT NULL,
      tickets  INTEGER NOT NULL,
      PRIMARY KEY (round_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id                          TEXT PRIMARY KEY,
      redemption_channel_id             TEXT,
      give_role_id                      TEXT,

      daily_min                         INTEGER NOT NULL DEFAULT 50,
      daily_max                         INTEGER NOT NULL DEFAULT 150,
      daily_streak_bonus                INTEGER NOT NULL DEFAULT 10,
      daily_streak_cap                  INTEGER NOT NULL DEFAULT 7,

      activity_enabled                  INTEGER NOT NULL DEFAULT 0,
      activity_drop_chance              REAL    NOT NULL DEFAULT 0.05,
      activity_drop_min                 INTEGER NOT NULL DEFAULT 1,
      activity_drop_max                 INTEGER NOT NULL DEFAULT 5,
      activity_drop_cooldown_seconds    INTEGER NOT NULL DEFAULT 60,
      activity_drop_daily_cap           INTEGER NOT NULL DEFAULT 50,
      activity_drop_emoji               TEXT,

      claim_drops_enabled               INTEGER NOT NULL DEFAULT 0,
      claim_drop_min                    INTEGER NOT NULL DEFAULT 5,
      claim_drop_max                    INTEGER NOT NULL DEFAULT 25,
      claim_drop_window_seconds         INTEGER NOT NULL DEFAULT 60,
      claim_drop_active_window_minutes  INTEGER NOT NULL DEFAULT 15,
      claim_drop_probability_per_tick   REAL    NOT NULL DEFAULT 0.10,
      claim_drop_tick_seconds           INTEGER NOT NULL DEFAULT 600,
      claim_drop_emoji                  TEXT,
      claim_drop_min_gap_minutes        INTEGER NOT NULL DEFAULT 60,

      bet_min                           INTEGER NOT NULL DEFAULT 1,
      bet_max                           INTEGER NOT NULL DEFAULT 1000,
      slots_house_edge_bps              INTEGER NOT NULL DEFAULT 200,
      duel_announce_channel_id          TEXT,

      lottery_enabled                   INTEGER NOT NULL DEFAULT 0,
      lottery_ticket_price              INTEGER NOT NULL DEFAULT 100,
      lottery_draw_channel_id           TEXT,
      lottery_period_hours              INTEGER NOT NULL DEFAULT 168
    );
  `);
}
