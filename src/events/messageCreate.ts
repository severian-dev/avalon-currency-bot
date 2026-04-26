import type { Message } from 'discord.js';
import type Database from 'better-sqlite3';
import * as channelActivityRepo from '../database/repositories/channelActivityRepo.js';
import { maybeAwardForMessage } from '../services/activityDropService.js';
import { nowIso } from '../utils/time.js';

export const name = 'messageCreate';

export async function execute(message: Message, db: Database.Database): Promise<void> {
  if (!message.guild) return;
  if (message.author.bot) return;

  channelActivityRepo.touch(db, message.guild.id, message.channelId, nowIso());

  const result = maybeAwardForMessage(db, message);
  if (result && result.emoji) {
    try {
      await message.react(result.emoji);
    } catch (err) {
      console.error('Failed to react with drop emoji:', err);
    }
  }
}
