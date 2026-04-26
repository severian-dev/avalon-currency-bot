import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import * as shopRepo from '../database/repositories/shopRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { shopEmbed, shopButtons, SHOP_PAGE_SIZE } from '../builders/shopEmbed.js';

export const data = new SlashCommandBuilder()
  .setName('shop')
  .setDescription('Browse the crystal shop')
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;

  const total = shopRepo.countActive(db, interaction.guildId);
  const items = shopRepo.listActivePage(db, interaction.guildId, 0, SHOP_PAGE_SIZE);
  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);

  const buttons = shopButtons(0, total);
  await interaction.reply({
    embeds: [shopEmbed(items, emoji, 0, total)],
    components: buttons ? [buttons] : [],
  });
}
