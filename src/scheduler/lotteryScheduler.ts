import { ChannelType, type Client, type TextChannel } from 'discord.js';
import type Database from 'better-sqlite3';
import { drawDueRounds } from '../services/lotteryService.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { lotteryDrawEmbed } from '../builders/lotteryEmbed.js';

const TICK_SECONDS = 60;

export function startLotteryScheduler(client: Client, db: Database.Database): NodeJS.Timeout {
  const tick = async () => {
    try {
      const results = drawDueRounds(db);
      for (const r of results) {
        if (!r.drawChannelId) continue;
        try {
          const channel = await client.channels.fetch(r.drawChannelId);
          if (!channel || channel.type !== ChannelType.GuildText) continue;
          const emoji = guildConfigRepo.getCrystalEmoji(db, r.guildId);
          const content = r.winnerUserId ? `<@${r.winnerUserId}>` : '';
          await (channel as TextChannel).send({
            content,
            embeds: [lotteryDrawEmbed(r.pot, r.winnerUserId, emoji)],
            allowedMentions: r.winnerUserId ? { users: [r.winnerUserId] } : { parse: [] },
          });
        } catch (err) {
          console.error('Failed to post lottery draw result:', err);
        }
      }
    } catch (err) {
      console.error('lottery tick error:', err);
    }
  };

  return setInterval(tick, TICK_SECONDS * 1000);
}
