import { EmbedBuilder } from 'discord.js';
import type { UserRow } from '../database/repositories/userRepo.js';
import { crystals } from '../utils/formatting.js';

export function leaderboardEmbed(rows: UserRow[], emoji: string): EmbedBuilder {
  const embed = new EmbedBuilder().setTitle(`${emoji} Crystal Leaderboard`).setColor(0x9b59ff);

  if (rows.length === 0) {
    embed.setDescription('No one has any crystals yet.');
    return embed;
  }

  const medal = (i: number): string =>
    i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
  const lines = rows.map((row, i) => `${medal(i)} <@${row.user_id}> — ${crystals(row.balance, emoji)}`);
  embed.setDescription(lines.join('\n'));
  return embed;
}
