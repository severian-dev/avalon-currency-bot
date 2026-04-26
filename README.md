# Avalon Currency Bot

A Discord bot that runs a server-currency economy ("crystals") for the Avalon server. Per-user balances, a redeemable shop, daily claims, peer transfers, forum-post rewards, random message drops, scheduled claim-drops in active channels, and gambling minigames.

The full feature spec lives in [`SPECIFICATION.md`](./SPECIFICATION.md).

## Features

- **Crystals** — single integer currency per user per guild, all changes audited in a `transactions` ledger
- **Shop** — admins add items with name / description / price / optional stock / optional payload (e.g. a redeem code DM'd on purchase). Users browse via `/shop` and buy via `/redeem`
- **Redemption channel** — pending redemptions post to a configurable channel for admin fulfillment, with `/redemption fulfill` and `/redemption deny` (refund) commands
- **Daily** — `/daily` once per 24h, random in a configured range, optional streak bonus
- **Give** — role-gated `/give` for peer transfers from the sender's own balance
- **Grant / Revoke** — owner-only mint and burn commands for fixing balances
- **Forum-post rewards** — configure forums to pay out a fixed amount when someone creates a thread, with idempotent payouts (one per thread, ever) and an acknowledgement post in the thread
- **Per-message lucky drops** — random low-percentage drops on activity in allowlisted channels, with cooldown and daily cap; bot reacts with a configurable emoji on the lucky message
- **Scheduled claim drops** — at random ticks the bot posts a drop message in active allowlisted channels; **first user to react wins the whole drop**, the bot announces who got it
- **Gambling**
  - `/coinflip` — pure 50/50, win 2x stake
  - `/slots` — three-reel emoji slots, configurable house edge
  - `/duel` — consensual PvP gambling with button-confirm
  - `/lottery` — accumulating pot drawn on a configurable cron, weekly by default

## Tech Stack

| Component | Choice |
|---|---|
| Language | TypeScript (strict, ESM) |
| Runtime | Node.js 20+ |
| Discord library | discord.js v14 |
| Database | SQLite via better-sqlite3 |
| Config validation | Zod |
| Build | tsup |
| Dev runner | tsx |

## Prerequisites

- Node.js 20 or later
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- The bot invited to your server with at least: `Send Messages`, `Embed Links`, `Add Reactions`, `Read Message History`, `Use Application Commands`. To DM redemption payloads, users must allow DMs from server members.
- Privileged gateway intents enabled in the Developer Portal: **Message Content Intent** (for activity tracking), **Server Members Intent** (for `/balance @user` resolution against members)

## Setup

1. `cp .env.example .env` and fill in `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`, `OWNER_DISCORD_ID`.
2. `npm install`
3. `npm run deploy-commands` — registers the slash commands against your guild.
4. `npm run dev` — start the bot.
5. In Discord, run `/setup` as a Manage-Guild user to configure the redemption channel, give-role, daily range, drop emojis, and channel allowlists.

## Status

🚧 Scaffolded. See `SPECIFICATION.md` for the agreed feature set and `CHANGELOG.md` for what's actually been built.
