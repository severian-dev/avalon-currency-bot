import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as forumRewardsRepo from '../database/repositories/forumRewardsRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { isAdmin } from '../services/permissionService.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('forum-reward')
  .setDescription('[Admin] Configure per-forum thread payouts')
  .addSubcommand((s) =>
    s
      .setName('set')
      .setDescription('Set the payout amount for a forum')
      .addChannelOption((o) =>
        o
          .setName('forum')
          .setDescription('Forum channel')
          .addChannelTypes(ChannelType.GuildForum)
          .setRequired(true),
      )
      .addIntegerOption((o) =>
        o.setName('amount').setDescription('Crystals per new thread').setMinValue(0).setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('remove')
      .setDescription('Stop paying for new threads in a forum')
      .addChannelOption((o) =>
        o
          .setName('forum')
          .setDescription('Forum channel')
          .addChannelTypes(ChannelType.GuildForum)
          .setRequired(true),
      ),
  )
  .addSubcommand((s) => s.setName('list').setDescription('List configured forums'))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  if (!isAdmin(interaction)) {
    await interaction.reply({ content: '⛔ Manage Guild permission required.', ephemeral: true });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);
  if (sub === 'set') {
    const forum = interaction.options.getChannel('forum', true);
    const amount = interaction.options.getInteger('amount', true);
    forumRewardsRepo.set(db, interaction.guildId, forum.id, amount);
    await interaction.reply({
      content: `✅ <#${forum.id}> will pay ${crystals(amount, emoji)} per new thread.`,
      ephemeral: true,
    });
    return;
  }

  if (sub === 'remove') {
    const forum = interaction.options.getChannel('forum', true);
    const removed = forumRewardsRepo.remove(db, interaction.guildId, forum.id);
    await interaction.reply({
      content: removed ? `✅ Removed payout for <#${forum.id}>.` : `<#${forum.id}> wasn't configured.`,
      ephemeral: true,
    });
    return;
  }

  if (sub === 'list') {
    const rows = forumRewardsRepo.listForGuild(db, interaction.guildId);
    if (rows.length === 0) {
      await interaction.reply({ content: 'No forums configured.', ephemeral: true });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle('Forum thread payouts')
      .setColor(0x9b59ff)
      .setDescription(rows.map((r) => `<#${r.forum_id}> — ${crystals(r.amount, emoji)}`).join('\n'));
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}
