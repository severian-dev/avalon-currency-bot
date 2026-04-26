import { EmbedBuilder } from 'discord.js';
import type { RedemptionRow } from '../database/repositories/redemptionRepo.js';
import type { ShopItemRow } from '../database/repositories/shopRepo.js';
import { crystals } from '../utils/formatting.js';

export function pendingRedemptionEmbed(
  redemption: RedemptionRow,
  item: ShopItemRow,
  emoji: string,
): EmbedBuilder {
  const itemDisplay = item.emoji ? `${item.emoji} ${item.name}` : item.name;
  return new EmbedBuilder()
    .setTitle(`🎁 New redemption · #${redemption.id}`)
    .setDescription(
      `<@${redemption.user_id}> redeemed **${itemDisplay}** for ${crystals(redemption.price_paid, emoji)}.`,
    )
    .addFields(
      { name: 'Item ID', value: String(item.id), inline: true },
      { name: 'Status', value: '🟡 Pending', inline: true },
      ...(item.description ? [{ name: 'Description', value: item.description }] : []),
    )
    .setFooter({
      text: `Use /redemption fulfill ${redemption.id}  or  /redemption deny ${redemption.id}`,
    })
    .setColor(0xf1c40f)
    .setTimestamp(new Date(redemption.redeemed_at));
}

export function redemptionListEmbed(
  rows: RedemptionRow[],
  emoji: string,
  filter?: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Redemptions' + (filter ? ` · ${filter}` : ''))
    .setColor(0x9b59ff);

  if (rows.length === 0) {
    embed.setDescription('No redemptions match.');
    return embed;
  }

  const icon = (s: string): string =>
    s === 'pending' ? '🟡' : s === 'fulfilled' ? '✅' : s === 'denied' ? '❌' : '•';
  const lines = rows.slice(0, 25).map(
    (r) =>
      `${icon(r.status)} **#${r.id}** · <@${r.user_id}> · item ${r.item_id} · ${crystals(r.price_paid, emoji)}`,
  );
  embed.setDescription(lines.join('\n'));
  return embed;
}
