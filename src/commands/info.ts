import { SlashCommandBuilder, type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type Database from 'better-sqlite3';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';

export const data = new SlashCommandBuilder()
  .setName('info')
  .setDescription('List every bot command and what it does')
  .setDMPermission(false);

const SECTIONS: Array<{ title: string; lines: string[] }> = [
  {
    title: '👤 Everyone',
    lines: [
      '`/info` — show this list',
      '`/balance [user]` — check your or another user\'s crystal balance',
      '`/daily` — claim today\'s crystals (random amount, with streak bonus)',
      '`/leaderboard` — top crystal holders',
      '`/shop` — browse the crystal shop',
      '`/redeem <item>` — buy an item from the shop (admin will fulfill)',
    ],
  },
  {
    title: '🎲 Gambling',
    lines: [
      '`/coinflip <amount> <heads|tails>` — pure 50/50, win 2× stake',
      '`/slots <amount>` — three-reel slots, match symbols to win',
      '`/duel <user> <amount>` — challenge someone to a crystal duel (winner takes the pot)',
      '`/lottery info` — current pot, your tickets, draw time',
      '`/lottery buy <tickets>` — buy tickets into the open round',
    ],
  },
  {
    title: '🤝 Role-gated · /give',
    lines: [
      '`/give <user> <amount>` — transfer your own crystals to someone else (requires the configured give-role)',
    ],
  },
  {
    title: '🛠️ Admin · Manage Guild',
    lines: [
      '`/setup` — set redemption channel, give-role, daily range, drop emojis, lottery channel in one shot',
      '`/config show` — print all current config values',
      '`/config set <key> <value>` — edit any single config field (use `null` to clear)',
      '`/shop-add <name> <price> [stock] [description] [payload] [emoji]` — add a shop item',
      '`/shop-edit <id> <field> <value>` — edit a shop item',
      '`/shop-remove <id>` — soft-delete a shop item',
      '`/forum-reward set <forum> <amount>` — pay crystals on new threads in a forum',
      '`/forum-reward remove <forum>` — stop paying for a forum',
      '`/forum-reward list` — show configured forums',
      '`/redemption list [status]` — list pending/fulfilled/denied redemptions',
      '`/redemption fulfill <id> [notes]` — mark a redemption fulfilled',
      '`/redemption deny <id> [notes]` — refund and mark denied',
      '`/activity-channel add|remove|list` — control the per-message lucky-drop allowlist',
      '`/claim-drop-channel add|remove|list` — control the scheduled claim-drop allowlist',
    ],
  },
  {
    title: '👑 Owner only',
    lines: [
      '`/grant <user> <amount> [reason]` — mint crystals to a user (or use negative to burn)',
      '`/revoke <user> <amount> [reason]` — burn crystals from a user (allows negative balance)',
    ],
  },
];

const PASSIVE_LINES = [
  '**Lucky message drops** — random small payouts when you chat in allowlisted channels. The bot reacts with the configured emoji on the lucky message.',
  '**Claim drops** — at random times the bot posts a drop in active channels. **First to react with the configured emoji wins the whole pot**, and the bot announces who got it.',
  '**Forum rewards** — make a thread in a configured forum and the bot credits you crystals (one payout per thread, ever).',
];

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  const emoji = interaction.guildId
    ? guildConfigRepo.getCrystalEmoji(db, interaction.guildId)
    : '💎';
  const embed = new EmbedBuilder()
    .setTitle(`${emoji} Avalon Crystals — Command List`)
    .setColor(0x9b59ff)
    .setDescription(SECTIONS.map((s) => `**${s.title}**\n${s.lines.join('\n')}`).join('\n\n'))
    .addFields({ name: '✨ Passive features', value: PASSIVE_LINES.join('\n\n') });

  await interaction.reply({ embeds: [embed] });
}
