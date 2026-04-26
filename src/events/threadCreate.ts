import { ChannelType, type AnyThreadChannel } from 'discord.js';
import type Database from 'better-sqlite3';
import * as forumRewardsRepo from '../database/repositories/forumRewardsRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { applyDelta } from '../services/currencyService.js';
import { crystals } from '../utils/formatting.js';

export const name = 'threadCreate';

export async function execute(
  thread: AnyThreadChannel,
  newlyCreated: boolean,
  db: Database.Database,
): Promise<void> {
  if (!newlyCreated) return;
  if (!thread.guild) return;
  if (!thread.parent || thread.parent.type !== ChannelType.GuildForum) return;
  if (!thread.ownerId) return;

  // Skip bot-authored threads
  try {
    const owner = await thread.guild.members.fetch(thread.ownerId).catch(() => null);
    if (owner?.user.bot) return;
  } catch {
    // continue if we can't fetch — owner ID might still be a user
  }

  const reward = forumRewardsRepo.get(db, thread.guild.id, thread.parentId!);
  if (!reward || reward.amount <= 0) return;

  if (forumRewardsRepo.hasPaid(db, thread.id)) return;

  const recorded = forumRewardsRepo.recordPayout(
    db,
    thread.id,
    thread.guild.id,
    thread.ownerId,
    reward.amount,
  );
  if (!recorded) return;

  applyDelta(
    db,
    thread.guild.id,
    thread.ownerId,
    reward.amount,
    'forum',
    thread.id,
    { allowNegativeBalance: true },
  );

  const emoji = guildConfigRepo.getCrystalEmoji(db, thread.guild.id);
  try {
    await thread.send({
      content: `<@${thread.ownerId}> earned ${crystals(reward.amount, emoji)} for posting in <#${thread.parentId}>!`,
      allowedMentions: { users: [thread.ownerId] },
    });
  } catch (err) {
    console.error('Failed to post forum reward acknowledgement:', err);
  }
}
