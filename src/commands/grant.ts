import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotEnv } from '../config/schema.js';
import { applyDelta } from '../services/currencyService.js';
import { isOwner } from '../services/permissionService.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('grant')
  .setDescription('[Owner only] Mint crystals to a user')
  .addUserOption((o) => o.setName('user').setDescription('Recipient').setRequired(true))
  .addIntegerOption((o) =>
    o.setName('amount').setDescription('Amount (negative to burn)').setRequired(true),
  )
  .addStringOption((o) => o.setName('reason').setDescription('Reason (audit)').setRequired(false))
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
  env: BotEnv,
): Promise<void> {
  if (!interaction.guildId) return;
  if (!isOwner(interaction, env.OWNER_DISCORD_ID)) {
    await interaction.reply({ content: '⛔ Owner only.', ephemeral: true });
    return;
  }

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);
  const reason = interaction.options.getString('reason') ?? null;

  if (amount === 0) {
    await interaction.reply({ content: 'Amount must be non-zero.', ephemeral: true });
    return;
  }

  const newBalance = applyDelta(
    db,
    interaction.guildId,
    target.id,
    amount,
    'grant',
    reason,
    { allowNegativeBalance: true },
  );

  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);
  const verb = amount > 0 ? 'granted' : 'removed';
  const abs = Math.abs(amount);
  await interaction.reply({
    content: `✅ ${verb} ${crystals(abs, emoji)} ${amount > 0 ? 'to' : 'from'} <@${target.id}>.\nNew balance: ${crystals(newBalance, emoji)}` +
      (reason ? `\nReason: ${reason}` : ''),
    ephemeral: true,
  });
}
