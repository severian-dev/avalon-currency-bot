# Changelog

All notable changes to this project will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- Configurable `crystal_emoji` (per guild): replaces the hardcoded 💎 in every balance, price, payout, and embed display. Set via `/setup crystal_emoji:<emoji>` or `/config set crystal_emoji <emoji>`. Falls back to 💎 if unset.
- Per-shop-item `emoji`: `/shop-add` and `/shop-edit` accept an `emoji` field that's shown beside the item in `/shop`, in `/redeem` confirmations, the redemption-channel embed, and the `/redeem` autocomplete picker.

### Added
- Initial scaffold: package.json, tsconfig, tsup, .gitignore, .env.example
- `SPECIFICATION.md`, `CLAUDE.md`, `README.md`
- Database: 14-table schema covering users, transactions, shop, redemptions, forum payouts, activity, claim drops, channel activity, lottery, and per-guild config
- Currency core: `currencyService.applyDelta()` and `transfer()` as the single chokepoint for all balance changes, with append-only `transactions` audit log and `InsufficientFundsError`
- Player commands: `/balance`, `/daily` (with streak bonus), `/give` (role-gated transfer), `/shop`, `/redeem` (with item autocomplete, posts pending redemption to redemption channel, DMs payload), `/leaderboard`
- Owner-only commands: `/grant`, `/revoke` (locked to `OWNER_DISCORD_ID`)
- Admin commands: `/setup`, `/config show|set`, `/shop-add|edit|remove`, `/forum-reward set|remove|list`, `/redemption list|fulfill|deny` (deny refunds and re-stocks), `/activity-channel add|remove|list`, `/claim-drop-channel add|remove|list`
- Gambling: `/coinflip` (50/50 2x), `/slots` (3-reel emoji slots, fixed pay table, ~4% house edge), `/duel` (button-confirm consensual PvP), `/lottery buy|info` with weighted draw
- Passive listeners: `messageCreate` (channel activity tracking + per-message lucky drops with reaction emoji), `threadCreate` (forum payouts with idempotency on `forum_payouts.thread_id` and acknowledgement reply), `messageReactionAdd` (single-winner claim drops with atomic claim, channel confirmation, and message edit)
- Schedulers: claim-drop tick (60s) gating on `channel_activity.last_message_at` for active-channel-only drops, plus expiry sweep; lottery scheduler that draws due rounds, posts results, and opens the next round
- Command deploy script (`npm run deploy-commands`) registers all 22 slash commands
- `/info` — single ephemeral command listing every command grouped by category (Everyone, Gambling, Role-gated, Admin, Owner) plus a passive-features section
