import { EmbedBuilder } from 'discord.js';
import type { ShopItemRow } from '../database/repositories/shopRepo.js';
import { crystals } from '../utils/formatting.js';

export function shopEmbed(items: ShopItemRow[], emoji: string): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(`${emoji} Crystal Shop`).setColor(0x9b59ff);

  if (items.length === 0) {
    embed.setDescription('The shop is empty. Check back later.');
    return embed;
  }

  const visible = items.slice(0, 25);
  for (const item of visible) {
    const stock = item.stock === null ? '∞' : `${item.stock} left`;
    const desc = item.description ? `${item.description}\n` : '';
    const itemEmoji = item.emoji ? `${item.emoji} ` : '';
    embed.addFields({
      name: `#${item.id} · ${itemEmoji}${item.name} — ${crystals(item.price, emoji)}`,
      value: `${desc}Stock: ${stock}`,
    });
  }

  if (items.length > visible.length) {
    embed.setFooter({ text: `Showing ${visible.length} of ${items.length} items` });
  } else {
    embed.setFooter({ text: 'Use /redeem to buy.' });
  }

  return embed;
}
