import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotEnv } from '../config/schema.js';
import { applyDelta } from '../services/currencyService.js';
import { isOwner } from '../services/permissionService.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('revoke')
  .setDescription('[Owner only] Burn crystals from a user (allows negative balance)')
  .addUserOption((o) => o.setName('user').setDescription('Target').setRequired(true))
  .addIntegerOption((o) =>
    o.setName('amount').setDescription('Amount to remove').setMinValue(1).setRequired(true),
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

  const newBalance = applyDelta(
    db,
    interaction.guildId,
    target.id,
    -amount,
    'revoke',
    reason,
    { allowNegativeBalance: true },
  );

  await interaction.reply({
    content: `🗡️ Revoked ${crystals(amount)} from <@${target.id}>.\nNew balance: ${crystals(newBalance)}` +
      (reason ? `\nReason: ${reason}` : ''),
    ephemeral: true,
  });
}
