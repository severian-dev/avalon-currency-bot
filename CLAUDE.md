# CLAUDE.md

Project-specific instructions for working on avalon-currency-bot.

## Project Overview

Discord bot that runs a server-currency economy ("crystals") for the Avalon server. Tracks per-user balances, runs a redeemable shop, daily claims, peer transfers, forum-post rewards, random message drops with reaction feedback, scheduled claim-drops in active channels (single-winner, first-to-react), and gambling minigames (coinflip, slots, duel, lottery).

The full feature spec lives in `SPECIFICATION.md` — treat it as the source of truth.

## Key Commands

- `npm run dev` — run with tsx (development)
- `npm run build` — compile with tsup
- `npm start` — run compiled output (requires .env)
- `npm run deploy-commands` — register slash commands with Discord
- `npm run typecheck` — `tsc --noEmit`

## Project Structure

- `src/commands/` — slash command definitions, one file per command
- `src/events/` — Discord event handlers (`messageCreate`, `threadCreate`, `messageReactionAdd`, `interactionCreate`, `ready`)
- `src/handlers/` — button/modal interaction handlers (e.g. duel accept, redemption fulfill buttons)
- `src/builders/` — pure functions that construct embeds, action rows, modals
- `src/services/` — business logic, no Discord API. `currencyService.applyDelta()` is the single chokepoint for balance changes
- `src/database/repositories/` — data access layer, one file per table
- `src/scheduler/` — claim-drop tick + lottery draw cron
- `src/config/` — env loader and zod schema
- `src/types/` — shared types and custom-ID constants
- `docs/` — implementation notes
- `scripts/` — operational scripts (e.g. seed config, reset balances)

## Conventions

- **Single chokepoint for balance changes.** Every credit/debit goes through `currencyService.applyDelta(guildId, userId, delta, kind, ref?)`. It writes both `users.balance` and a `transactions` row in one SQLite transaction. Nothing else touches `users.balance` directly.
- **Owner-only commands** check `process.env.OWNER_DISCORD_ID` against `interaction.user.id`. They never rely on guild perms.
- **Admin commands** check `PermissionFlagsBits.ManageGuild` on the caller.
- **Idempotency keys**: `forum_payouts.thread_id` (one payout per thread, ever), `claim_drops.id` with an atomic conditional UPDATE for single-winner claim.
- **Money is integers.** Crystals are whole numbers. No floats anywhere in the currency path.
- **Per-guild data.** Every table that holds user/server data has `guild_id`. The bot is multi-guild-safe even if we only run it in one server today.
- **Custom IDs** for buttons/modals are centralized in `src/types/customIds.ts`.
- **Config is layered.** `.env` for secrets (token, owner ID). `guild_config` table for per-server behavior, edited via `/setup` and `/config set`. No `config.json`.

## Documentation Rules

When making changes, **always update**:

- **CHANGELOG.md** — add entries under `[Unreleased]` following Keep a Changelog format. Group under `Added`, `Changed`, `Fixed`, or `Removed`.
- **README.md** — update the features list or command table if user-facing behavior changes.
- **SPECIFICATION.md** — update if the data model or feature scope changes.
