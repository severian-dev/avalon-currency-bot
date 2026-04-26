import { EmbedBuilder, type User } from 'discord.js';
import { crystals } from '../utils/formatting.js';

export function balanceEmbed(
  target: User,
  balance: number,
  streak: number | null,
  emoji: string,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${target.displayName ?? target.username}'s Crystals`)
    .setThumbnail(target.displayAvatarURL())
    .setDescription(`**${crystals(balance, emoji)}**`)
    .setColor(0x9b59ff);
  if (streak && streak > 0) {
    embed.addFields({
      name: 'Daily streak',
      value: `🔥 ${streak} day${streak === 1 ? '' : 's'}`,
      inline: true,
    });
  }
  embed.setFooter({ text: emoji });
  return embed;
}
