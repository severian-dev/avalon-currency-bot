import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import * as userRepo from '../database/repositories/userRepo.js';
import { leaderboardEmbed } from '../builders/leaderboardEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Show the top crystal holders')
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const rows = userRepo.leaderboard(db, interaction.guildId, 10);
  await interaction.reply({
    embeds: [leaderboardEmbed(rows)],
    allowedMentions: { parse: [] },
  });
}
