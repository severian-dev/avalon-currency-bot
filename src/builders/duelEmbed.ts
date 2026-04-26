import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { DUEL_ACCEPT, DUEL_DECLINE, buildDuelButtonId } from '../types/customIds.js';
import { crystals } from '../utils/formatting.js';

export function duelChallengeEmbed(
  challengerId: string,
  opponentId: string,
  stake: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('⚔️ Crystal Duel')
    .setDescription(
      `<@${challengerId}> challenges <@${opponentId}> to a duel for **${crystals(stake)}**!\n` +
        `<@${opponentId}>, you have 60 seconds to accept.`,
    )
    .setColor(0xe67e22);
}

export function duelButtons(duelKey: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(buildDuelButtonId(DUEL_ACCEPT, duelKey))
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(buildDuelButtonId(DUEL_DECLINE, duelKey))
      .setLabel('Decline')
      .setStyle(ButtonStyle.Secondary),
  );
}

export function duelResultEmbed(
  winnerId: string,
  loserId: string,
  stake: number,
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('⚔️ Duel resolved')
    .setDescription(
      `<@${winnerId}> wins ${crystals(stake)} from <@${loserId}>!`,
    )
    .setColor(0x2ecc71);
}
