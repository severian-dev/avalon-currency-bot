import { EmbedBuilder } from 'discord.js';
import type { LotteryRoundRow } from '../database/repositories/lotteryRepo.js';
import { crystals } from '../utils/formatting.js';

export function lotteryInfoEmbed(
  round: LotteryRoundRow,
  ticketPrice: number,
  yourTickets: number,
): EmbedBuilder {
  const drawsAtUnix = Math.floor(new Date(round.draws_at).getTime() / 1000);
  return new EmbedBuilder()
    .setTitle('🎟️ Crystal Lottery')
    .setColor(0x9b59ff)
    .addFields(
      { name: 'Pot', value: crystals(round.pot), inline: true },
      { name: 'Ticket price', value: crystals(ticketPrice), inline: true },
      { name: 'Your tickets', value: String(yourTickets), inline: true },
      { name: 'Draws', value: `<t:${drawsAtUnix}:R> (<t:${drawsAtUnix}:f>)` },
    )
    .setFooter({ text: 'Use /lottery buy <count> to enter.' });
}

export function lotteryDrawEmbed(
  pot: number,
  winnerUserId: string | null,
): EmbedBuilder {
  if (!winnerUserId) {
    return new EmbedBuilder()
      .setTitle('🎟️ Lottery drawn')
      .setDescription('No tickets were sold this round. The pot rolls to the next round.')
      .setColor(0x95a5a6);
  }
  return new EmbedBuilder()
    .setTitle('🎟️ Lottery drawn!')
    .setDescription(`<@${winnerUserId}> wins **${crystals(pot)}**!`)
    .setColor(0x2ecc71);
}
