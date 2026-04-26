import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import type { ShopItemRow } from '../database/repositories/shopRepo.js';
import { crystals } from '../utils/formatting.js';
import { buildShopPageId } from '../types/customIds.js';

export const SHOP_PAGE_SIZE = 10;

export function shopEmbed(
  items: ShopItemRow[],
  emoji: string,
  page: number,
  total: number,
): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(`${emoji} Crystal Shop`).setColor(0x9b59ff);

  if (total === 0) {
    embed.setDescription('The shop is empty. Check back later.');
    return embed;
  }

  for (const item of items) {
    const stock = item.stock === null ? '∞' : `${item.stock} left`;
    const desc = item.description ? `${item.description}\n` : '';
    const itemEmoji = item.emoji ? `${item.emoji} ` : '';
    embed.addFields({
      name: `#${item.id} · ${itemEmoji}${item.name} — ${crystals(item.price, emoji)}`,
      value: `${desc}Stock: ${stock}`,
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  embed.setFooter({
    text: `Page ${page + 1} / ${totalPages} · ${total} item${total === 1 ? '' : 's'} · /redeem to buy`,
  });

  return embed;
}

export function shopButtons(
  page: number,
  total: number,
): ActionRowBuilder<ButtonBuilder> | null {
  const totalPages = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  if (totalPages <= 1) return null;
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildShopPageId(page - 1))
      .setLabel('← Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(buildShopPageId(page + 1))
      .setLabel('Next →')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}
