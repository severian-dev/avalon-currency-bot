import { type ButtonInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import * as shopRepo from '../database/repositories/shopRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { shopEmbed, shopButtons, SHOP_PAGE_SIZE } from '../builders/shopEmbed.js';
import { parseShopPageId } from '../types/customIds.js';

export async function handle(interaction: ButtonInteraction, db: Database.Database): Promise<boolean> {
  const requestedPage = parseShopPageId(interaction.customId);
  if (requestedPage === null) return false;
  if (!interaction.guildId) return true;

  const total = shopRepo.countActive(db, interaction.guildId);
  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const page = Math.min(Math.max(0, requestedPage), totalPages - 1);

  const items = shopRepo.listActivePage(db, interaction.guildId, page * SHOP_PAGE_SIZE, SHOP_PAGE_SIZE);
  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);

  const buttons = shopButtons(page, total);
  await interaction.update({
    embeds: [shopEmbed(items, emoji, page, total)],
    components: buttons ? [buttons] : [],
  });
  return true;
}
