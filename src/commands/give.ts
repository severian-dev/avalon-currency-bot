import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import { transfer, InsufficientFundsError } from '../services/currencyService.js';
import { memberHasRole } from '../services/permissionService.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('give')
  .setDescription('Give some of your own crystals to another user')
  .addUserOption((o) => o.setName('user').setDescription('Who to send to').setRequired(true))
  .addIntegerOption((o) =>
    o.setName('amount').setDescription('How many crystals').setMinValue(1).setRequired(true),
  )
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId || !interaction.guild) return;

  const config = guildConfigRepo.get(db, interaction.guildId);
  if (!config.give_role_id) {
    await interaction.reply({
      content: '⚠️ The `/give` role is not configured. Ask an admin to run `/setup` or `/config set give_role_id`.',
      ephemeral: true,
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!memberHasRole(member, config.give_role_id)) {
    await interaction.reply({
      content: `⛔ You need the <@&${config.give_role_id}> role to use \`/give\`.`,
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
    return;
  }

  const target = interaction.options.getUser('user', true);
  const amount = interaction.options.getInteger('amount', true);

  if (target.bot) {
    await interaction.reply({ content: '🙅 You can\'t give crystals to a bot.', ephemeral: true });
    return;
  }
  if (target.id === interaction.user.id) {
    await interaction.reply({ content: '🙅 You can\'t give crystals to yourself.', ephemeral: true });
    return;
  }

  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);

  try {
    const { fromBalance } = transfer(
      db,
      interaction.guildId,
      interaction.user.id,
      target.id,
      amount,
      'give',
    );
    await interaction.reply({
      content: `✨ <@${interaction.user.id}> gave ${crystals(amount, emoji)} to <@${target.id}>!\n` +
        `Your balance: ${crystals(fromBalance, emoji)}`,
      allowedMentions: { users: [target.id] },
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      await interaction.reply({
        content: `⛔ You only have ${crystals(err.balance, emoji)}.`,
        ephemeral: true,
      });
      return;
    }
    throw err;
  }
}
