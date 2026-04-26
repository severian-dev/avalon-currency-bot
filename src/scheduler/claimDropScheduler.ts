import { ChannelType, type Client, type TextChannel } from 'discord.js';
import type Database from 'better-sqlite3';
import { planDropsForTick, recordDropMessage, listExpired, markExpired } from '../services/claimDropService.js';
import { crystals } from '../utils/formatting.js';

const TICK_SECONDS = 60;

function dropMessageContent(amount: number, emoji: string | null, windowSeconds: number): string {
  const reactWith = emoji ? `react with ${emoji}` : 'react with the configured emoji';
  return (
    `✨ A crystal cluster appeared! First to ${reactWith} wins **${crystals(amount)}**!\n` +
    `_(${windowSeconds}s window — first one wins)_`
  );
}

export function startClaimDropScheduler(client: Client, db: Database.Database): NodeJS.Timeout {
  const tick = async () => {
    try {
      // Sweep expired open drops first.
      const expired = listExpired(db);
      for (const drop of expired) {
        markExpired(db, drop.id);
        try {
          const channel = await client.channels.fetch(drop.channel_id);
          if (channel && (channel.type === ChannelType.GuildText || channel.isThread())) {
            const message = await (channel as TextChannel).messages.fetch(drop.message_id).catch(() => null);
            if (message) {
              await message.edit({
                content: `⌛ The crystal drop expired with no one claiming **${crystals(drop.amount)}**.`,
                allowedMentions: { users: [] },
              });
            }
          }
        } catch (err) {
          console.error('Failed to mark expired drop in channel:', err);
        }
      }

      // Plan and post new drops.
      const plans = planDropsForTick(db, TICK_SECONDS);
      for (const plan of plans) {
        try {
          const channel = await client.channels.fetch(plan.channelId);
          if (!channel || channel.type !== ChannelType.GuildText) continue;
          const message = await (channel as TextChannel).send({
            content: dropMessageContent(plan.amount, plan.emoji, plan.windowSeconds),
          });
          recordDropMessage(db, plan, message.id);
          if (plan.emoji) {
            try {
              await message.react(plan.emoji);
            } catch (err) {
              console.error('Failed to seed claim-drop emoji:', err);
            }
          }
        } catch (err) {
          console.error('Failed to post claim drop:', err);
        }
      }
    } catch (err) {
      console.error('claim drop tick error:', err);
    }
  };

  return setInterval(tick, TICK_SECONDS * 1000);
}
