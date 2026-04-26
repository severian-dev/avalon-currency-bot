import { EmbedBuilder, type User } from 'discord.js';
import { CRYSTAL, crystals } from '../utils/formatting.js';

export function balanceEmbed(target: User, balance: number, streak: number | null): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${target.displayName ?? target.username}'s Crystals`)
    .setThumbnail(target.displayAvatarURL())
    .setDescription(`**${crystals(balance)}**`)
    .setColor(0x9b59ff);
  if (streak && streak > 0) {
    embed.addFields({ name: 'Daily streak', value: `🔥 ${streak} day${streak === 1 ? '' : 's'}`, inline: true });
  }
  embed.setFooter({ text: CRYSTAL });
  return embed;
}
