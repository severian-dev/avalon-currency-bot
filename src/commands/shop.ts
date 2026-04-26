import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import * as shopRepo from '../database/repositories/shopRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { shopEmbed } from '../builders/shopEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('Browse the crystal shop')
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const items = shopRepo.listActive(db, interaction.guildId);
  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);
  await interaction.reply({ embeds: [shopEmbed(items, emoji)] });
}
