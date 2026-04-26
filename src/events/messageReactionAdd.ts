import {
  type MessageReaction,
  type PartialMessageReaction,
  type User,
  type PartialUser,
  TextChannel,
  ChannelType,
} from 'discord.js';
import type Database from 'better-sqlite3';
import { tryClaim } from '../services/claimDropService.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { crystals } from '../utils/formatting.js';

export const name = 'messageReactionAdd';

export async function execute(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  db: Database.Database,
): Promise<void> {
  try {
    if (user.bot) return;

    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();

    const message = reaction.message;
    if (!message.guild) return;

    const reactionKey = reaction.emoji.id ?? reaction.emoji.name;
    if (!reactionKey) return;

    const result = tryClaim(db, message.guild.id, message.id, user.id, reactionKey);
    if (!result) return;

    const emoji = guildConfigRepo.getCrystalEmoji(db, message.guild.id);

    const channel = message.channel;
    if (channel.type === ChannelType.GuildText || channel.isThread()) {
      try {
        await (channel as TextChannel).send({
          content: `🎉 <@${user.id}> claimed **${crystals(result.amount, emoji)}** from the crystal drop!`,
          allowedMentions: { users: [user.id] },
        });
      } catch (err) {
        console.error('Failed to send claim confirmation:', err);
      }
    }

    try {
      await message.edit({
        content: `~~${message.content ?? ''}~~\n✅ Claimed by <@${user.id}> for ${crystals(result.amount, emoji)}.`,
        allowedMentions: { users: [] },
      });
    } catch {
      // best-effort: bot may not own the message in some edge cases
    }
  } catch (err) {
    console.error('messageReactionAdd error:', err);
  }
}
