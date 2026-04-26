# Avalon Currency Bot — Specification

A Discord bot that runs a server-currency economy ("crystals") for the Avalon server: balances, a redeemable shop, daily claims, peer transfers, forum-post rewards, random message drops, scheduled claim drops in active channels, and gambling minigames.

## Tech stack

| Component | Choice |
|---|---|
| Language | TypeScript (strict, ESM) |
| Runtime | Node.js 20+ |
| Discord library | discord.js v14 |
| Database | SQLite via better-sqlite3 |
| Config validation | zod |
| Build | tsup |
| Dev runner | tsx |

Mirrors the conventions of `avalon-quiz-bot` and `role-repost-bot` so the three sit beside each other cleanly.

## Permissions model

- **Owner-only.** Locked to `OWNER_DISCORD_ID` from env. Cannot be bypassed by guild perms.
  - `/grant`, `/revoke`
- **Guild admin** (`Manage Guild` permission). Setup and shop management.
  - `/setup`, `/config`, `/shop-add`, `/shop-edit`, `/shop-remove`, `/forum-reward *`, `/redemption *`
- **Role-gated.** Configurable role ID per guild.
  - `/give` — sender must hold the configured "give" role
- **Public.** Anyone in the guild.
  - `/balance`, `/daily`, `/shop`, `/redeem`, `/leaderboard`, `/coinflip`, `/slots`, `/duel`, `/lottery`

## Currency core

Single integer balance per `(guild_id, user_id)`. Every change goes through one `applyDelta()` service that:

1. Validates the user has sufficient balance (for negative deltas, unless minting via `/grant`).
2. Updates `users.balance`.
3. Writes a row to `transactions` with `kind` and `ref` (e.g. `kind='daily'`, `kind='shop_redeem'`, `ref=redemption_id`).

This makes audit, refunds, and `/revoke` trivial.

## Data model

```
users
  guild_id        TEXT
  user_id         TEXT
  balance         INTEGER NOT NULL DEFAULT 0
  last_daily_at   TEXT
  daily_streak    INTEGER NOT NULL DEFAULT 0
  PRIMARY KEY (guild_id, user_id)

transactions                       -- audit trail, append-only
  id              INTEGER PK
  guild_id        TEXT
  user_id         TEXT
  delta           INTEGER NOT NULL  -- signed
  kind            TEXT NOT NULL     -- grant|revoke|give|daily|activity|claim_drop|forum|shop_redeem|shop_refund|coinflip|slots|duel|lottery_buy|lottery_win
  ref             TEXT              -- e.g. redemption_id, thread_id, message_id
  at              TEXT DEFAULT (datetime('now'))

shop_items
  id              INTEGER PK
  guild_id        TEXT
  name            TEXT NOT NULL
  description     TEXT
  price           INTEGER NOT NULL
  stock           INTEGER           -- NULL = unlimited
  payload         TEXT              -- optional text DM'd on redeem (e.g. a code)
  emoji           TEXT              -- optional emoji shown beside the item in /shop
  active          INTEGER NOT NULL DEFAULT 1
  created_by      TEXT
  created_at      TEXT DEFAULT (datetime('now'))

redemptions
  id              INTEGER PK
  guild_id        TEXT
  user_id         TEXT
  item_id         INTEGER REFERENCES shop_items(id)
  price_paid      INTEGER NOT NULL
  status          TEXT NOT NULL     -- pending|fulfilled|denied
  redeemed_at     TEXT DEFAULT (datetime('now'))
  resolved_at     TEXT
  resolved_by     TEXT
  notes           TEXT

forum_rewards
  guild_id        TEXT
  forum_id        TEXT
  amount          INTEGER NOT NULL
  PRIMARY KEY (guild_id, forum_id)

forum_payouts                       -- idempotency: one payout per thread, ever
  thread_id       TEXT PRIMARY KEY
  guild_id        TEXT
  user_id         TEXT
  amount          INTEGER NOT NULL
  paid_at         TEXT DEFAULT (datetime('now'))

activity_channels                   -- per-message lottery allowlist
  guild_id        TEXT
  channel_id      TEXT
  PRIMARY KEY (guild_id, channel_id)

activity_cooldowns                  -- per-user lottery cooldown / daily cap
  guild_id        TEXT
  user_id         TEXT
  last_drop_at    TEXT
  earned_today    INTEGER NOT NULL DEFAULT 0
  earned_day      TEXT              -- YYYY-MM-DD bucket for earned_today
  PRIMARY KEY (guild_id, user_id)

claim_drop_channels                 -- scheduled claim-drop allowlist
  guild_id        TEXT
  channel_id      TEXT
  PRIMARY KEY (guild_id, channel_id)

claim_drops                         -- live + historical scheduled drops
  id              INTEGER PK
  guild_id        TEXT
  channel_id      TEXT
  message_id      TEXT
  amount          INTEGER NOT NULL
  status          TEXT NOT NULL     -- open|claimed|expired
  claimed_by      TEXT
  claimed_at      TEXT
  expires_at      TEXT NOT NULL
  created_at      TEXT DEFAULT (datetime('now'))

channel_activity                    -- last_message_at per channel for active-channel gating
  guild_id        TEXT
  channel_id      TEXT
  last_message_at TEXT
  PRIMARY KEY (guild_id, channel_id)

lottery_rounds
  id              INTEGER PK
  guild_id        TEXT
  status          TEXT NOT NULL     -- open|drawing|drawn
  pot             INTEGER NOT NULL DEFAULT 0
  draws_at        TEXT NOT NULL
  drawn_at        TEXT
  winner_user_id  TEXT
  winner_payout   INTEGER

lottery_tickets
  round_id        INTEGER REFERENCES lottery_rounds(id)
  user_id         TEXT
  tickets         INTEGER NOT NULL  -- aggregated count for this user this round
  PRIMARY KEY (round_id, user_id)

guild_config
  guild_id                              TEXT PRIMARY KEY
  redemption_channel_id                 TEXT
  give_role_id                          TEXT

  -- /daily
  daily_min                             INTEGER NOT NULL DEFAULT 50
  daily_max                             INTEGER NOT NULL DEFAULT 150
  daily_streak_bonus                    INTEGER NOT NULL DEFAULT 10  -- per consecutive day, capped
  daily_streak_cap                      INTEGER NOT NULL DEFAULT 7

  -- per-message activity drops
  activity_enabled                      INTEGER NOT NULL DEFAULT 0
  activity_drop_chance                  REAL    NOT NULL DEFAULT 0.05  -- 0..1
  activity_drop_min                     INTEGER NOT NULL DEFAULT 1
  activity_drop_max                     INTEGER NOT NULL DEFAULT 5
  activity_drop_cooldown_seconds        INTEGER NOT NULL DEFAULT 60
  activity_drop_daily_cap               INTEGER NOT NULL DEFAULT 50
  activity_drop_emoji                   TEXT                         -- unicode or "<:name:id>"

  -- scheduled claim drops
  claim_drops_enabled                   INTEGER NOT NULL DEFAULT 0
  claim_drop_min                        INTEGER NOT NULL DEFAULT 5
  claim_drop_max                        INTEGER NOT NULL DEFAULT 25
  claim_drop_window_seconds             INTEGER NOT NULL DEFAULT 60
  claim_drop_active_window_minutes      INTEGER NOT NULL DEFAULT 15
  claim_drop_probability_per_tick       REAL    NOT NULL DEFAULT 0.10
  claim_drop_tick_seconds               INTEGER NOT NULL DEFAULT 600
  claim_drop_emoji                      TEXT
  claim_drop_min_gap_minutes            INTEGER NOT NULL DEFAULT 60  -- per-channel quiet period

  -- gambling
  bet_min                               INTEGER NOT NULL DEFAULT 1
  bet_max                               INTEGER NOT NULL DEFAULT 1000
  slots_house_edge_bps                  INTEGER NOT NULL DEFAULT 200 -- 2%
  duel_announce_channel_id              TEXT

  -- lottery
  lottery_enabled                       INTEGER NOT NULL DEFAULT 0
  lottery_ticket_price                  INTEGER NOT NULL DEFAULT 100
  lottery_draw_channel_id               TEXT
  lottery_period_hours                  INTEGER NOT NULL DEFAULT 168  -- 1 week between draws

  -- branding
  crystal_emoji                         TEXT  -- replaces 💎 in every balance/price display; falls back to 💎 if unset
```

All `_at` columns are ISO-8601 strings written via `datetime('now')`.

## Slash commands

### Player-facing

| Command | Description |
|---|---|
| `/balance [user]` | Show own or another user's balance |
| `/daily` | Claim once per 24h. Random in `[daily_min, daily_max]` plus streak bonus |
| `/give <user> <amount>` | Transfer crystals from caller to target. Requires `give_role_id` |
| `/shop` | Paginated embed of active items |
| `/redeem <item>` | Buy an item. Deducts crystals, decrements stock if finite, posts pending redemption to `redemption_channel_id`, DMs `payload` if present |
| `/leaderboard` | Top N balances in the guild |

### Gambling

| Command | Description |
|---|---|
| `/coinflip <amount> <heads\|tails>` | Pure 50/50, win 2x stake |
| `/slots <amount>` | Three-reel emoji slots with a fixed pay table; `slots_house_edge_bps` controls EV |
| `/duel <user> <amount>` | Both stake equal, target accepts via button, RNG winner takes pot |
| `/lottery buy <tickets>` | Buy tickets into the open round at `lottery_ticket_price` |
| `/lottery info` | Current pot, your tickets, draw time |

### Owner-only

| Command | Description |
|---|---|
| `/grant <user> <amount> [reason]` | Mint crystals out of thin air |
| `/revoke <user> <amount> [reason]` | Burn crystals from a user |

### Admin (Manage Guild)

| Command | Description |
|---|---|
| `/setup` | Interactive: pick redemption channel, give-role, daily range, activity channels, drop emojis, claim-drop channels |
| `/config show` | Print current guild config |
| `/config set <key> <value>` | Edit a single config key |
| `/shop-add <name> <price> [stock] [description] [payload]` | Add a shop item |
| `/shop-edit <id> <field> <value>` | Edit a shop item |
| `/shop-remove <id>` | Soft-delete (sets `active = 0`) |
| `/forum-reward set <forum> <amount>` | Configure a forum's per-thread payout |
| `/forum-reward remove <forum>` | Stop paying for new threads in a forum |
| `/forum-reward list` | List configured forums and amounts |
| `/redemption list [status]` | List redemptions filtered by status |
| `/redemption fulfill <id> [notes]` | Mark fulfilled |
| `/redemption deny <id> [notes]` | Refund the user and mark denied |
| `/activity-channel add\|remove <channel>` | Allowlist for per-message drops |
| `/claim-drop-channel add\|remove <channel>` | Allowlist for scheduled drops |

## Passive listeners

### `messageCreate`

Three side effects, in order:

1. **Update `channel_activity.last_message_at`** for the message's channel (used by claim-drop scheduler).
2. **Per-message lucky drop** if `activity_enabled` and channel is in `activity_channels`:
   - Skip if user is a bot, message is a slash-command interaction echo, or content is empty (e.g. only stickers/embeds).
   - Skip if cooldown not elapsed (`activity_drop_cooldown_seconds`).
   - Skip if user is over `activity_drop_daily_cap` for today.
   - Roll `activity_drop_chance`. On hit:
     - Award random in `[activity_drop_min, activity_drop_max]`.
     - **React to the message with `activity_drop_emoji`** so the user sees they got lucky.
     - Write transaction `kind='activity'`, `ref=message_id`.
3. **Forum thread first message** — handled by `threadCreate` instead, see below.

### `threadCreate`

If the parent channel ID is in `forum_rewards` and the thread author isn't a bot:

1. Skip if `forum_payouts.thread_id` already exists (idempotent).
2. Credit the author the configured amount.
3. Reply in the thread acknowledging: `"<author> received N 💎 for posting in <forum>!"`.
4. Insert into `forum_payouts` and `transactions` with `kind='forum'`, `ref=thread_id`.

### `messageReactionAdd`

Only meaningful for **claim drops**. If the reacted message is in `claim_drops` with `status='open'`:

1. Verify the reactor isn't a bot.
2. Verify the reaction emoji matches `claim_drop_emoji`.
3. Verify the reactor has at least one message in `transactions` or `channel_activity`-known activity in this guild within 24h (anti-bot lurker filter — implementation can be a simple "has any prior message tracked" check via a lightweight `user_seen` table, optional).
4. **Atomic claim:** `UPDATE claim_drops SET status='claimed', claimed_by=?, claimed_at=now() WHERE id=? AND status='open'`. If `changes() === 0`, someone else got it first — silently ignore.
5. Award the amount, write `transactions` with `kind='claim_drop'`, `ref=drop_id`.
6. **Post a confirmation message in the channel:** `"<user> claimed N 💎 from the crystal drop!"` and edit the original drop message to a "claimed by ..." state so it's clear the drop is over.

### Tick scheduler (`setInterval`, every `claim_drop_tick_seconds`)

For each guild with `claim_drops_enabled = 1`:

For each channel in `claim_drop_channels`:

1. Skip if `channel_activity.last_message_at` is older than `claim_drop_active_window_minutes` ago — channel is dead.
2. Skip if the most recent `claim_drops` row for this channel was created less than `claim_drop_min_gap_minutes` ago.
3. Roll `claim_drop_probability_per_tick`. On hit:
   - Pick amount in `[claim_drop_min, claim_drop_max]`.
   - Post the drop message in the channel: `"✨ A crystal cluster appeared! React with <emoji> to claim N 💎 — first one wins!"`.
   - Insert `claim_drops` row with `expires_at = now + claim_drop_window_seconds`, `status='open'`, `message_id` of the post.
4. After window passes (separate sweep on each tick): for any `open` drop past `expires_at`, mark `expired` and edit the message to "no one claimed in time".

On boot: sweep `claim_drops` and mark anything past `expires_at` as `expired` (recovery from a crash mid-drop).

## Out of scope for v1

Listed so we know what we're saying no to:

- Trading / auctions between users
- `/rob` (toxicity risk)
- Group "heist" events
- Trivia drops (own bot exists; revisit later)
- Per-role daily multipliers
- Time-limited shop items, sales, wishlists
- Server jackpot meta-pot
- Web dashboard
- Multi-currency (only "crystals")

## Future work / nice-to-haves

- Streak protection (one missed day grace)
- Embeddable shop image cards
- Audit-log channel that auto-prints `/grant` and `/revoke` for transparency
- `/transfer-history` for users to see their own ledger
- Per-channel custom drop messages (so claim drops feel themed)
