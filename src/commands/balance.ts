import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import * as userRepo from '../database/repositories/userRepo.js';
import { balanceEmbed } from '../builders/balanceEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('balance')
  .setDescription('Show your or another user\'s crystal balance')
  .addUserOption((o) =>
    o.setName('user').setDescription('The user to check (defaults to you)').setRequired(false),
  )
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const target = interaction.options.getUser('user') ?? interaction.user;
  const row = userRepo.get(db, interaction.guildId, target.id);
  const balance = row?.balance ?? 0;
  const streak = target.id === interaction.user.id ? row?.daily_streak ?? null : null;
  await interaction.reply({ embeds: [balanceEmbed(target, balance, streak)] });
}
