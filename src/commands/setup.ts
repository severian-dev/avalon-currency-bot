import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { isAdmin } from '../services/permissionService.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('[Admin] Configure core bot settings in one shot')
  .addChannelOption((o) =>
    o
      .setName('redemption_channel')
      .setDescription('Channel where pending redemptions are posted')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false),
  )
  .addRoleOption((o) =>
    o.setName('give_role').setDescription('Role required to use /give').setRequired(false),
  )
  .addIntegerOption((o) =>
    o.setName('daily_min').setDescription('Minimum daily reward').setMinValue(0).setRequired(false),
  )
  .addIntegerOption((o) =>
    o.setName('daily_max').setDescription('Maximum daily reward').setMinValue(0).setRequired(false),
  )
  .addStringOption((o) =>
    o
      .setName('activity_drop_emoji')
      .setDescription('Emoji to react with on lucky message drops')
      .setRequired(false),
  )
  .addStringOption((o) =>
    o
      .setName('claim_drop_emoji')
      .setDescription('Emoji to react with to claim scheduled drops')
      .setRequired(false),
  )
  .addChannelOption((o) =>
    o
      .setName('lottery_draw_channel')
      .setDescription('Channel where lottery draw results post')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false),
  )
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

  const updates: string[] = [];

  const redemptionChannel = interaction.options.getChannel('redemption_channel');
  if (redemptionChannel) {
    guildConfigRepo.set(db, interaction.guildId, 'redemption_channel_id', redemptionChannel.id);
    updates.push(`redemption_channel = <#${redemptionChannel.id}>`);
  }

  const giveRole = interaction.options.getRole('give_role');
  if (giveRole) {
    guildConfigRepo.set(db, interaction.guildId, 'give_role_id', giveRole.id);
    updates.push(`give_role = <@&${giveRole.id}>`);
  }

  const dailyMin = interaction.options.getInteger('daily_min');
  if (dailyMin !== null) {
    guildConfigRepo.set(db, interaction.guildId, 'daily_min', dailyMin);
    updates.push(`daily_min = ${dailyMin}`);
  }

  const dailyMax = interaction.options.getInteger('daily_max');
  if (dailyMax !== null) {
    guildConfigRepo.set(db, interaction.guildId, 'daily_max', dailyMax);
    updates.push(`daily_max = ${dailyMax}`);
  }

  const activityEmoji = interaction.options.getString('activity_drop_emoji');
  if (activityEmoji) {
    guildConfigRepo.set(db, interaction.guildId, 'activity_drop_emoji', activityEmoji);
    updates.push(`activity_drop_emoji = ${activityEmoji}`);
  }

  const claimEmoji = interaction.options.getString('claim_drop_emoji');
  if (claimEmoji) {
    guildConfigRepo.set(db, interaction.guildId, 'claim_drop_emoji', claimEmoji);
    updates.push(`claim_drop_emoji = ${claimEmoji}`);
  }

  const lotteryChannel = interaction.options.getChannel('lottery_draw_channel');
  if (lotteryChannel) {
    guildConfigRepo.set(db, interaction.guildId, 'lottery_draw_channel_id', lotteryChannel.id);
    updates.push(`lottery_draw_channel = <#${lotteryChannel.id}>`);
  }

  if (updates.length === 0) {
    await interaction.reply({
      content:
        'No options provided. Run `/setup` with options, or use `/config show` to see all settings and `/config set <key> <value>` for individual fields.\n' +
        'Channel allowlists: `/activity-channel add|remove`, `/claim-drop-channel add|remove`, `/forum-reward set|remove`.',
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `✅ Updated:\n${updates.map((u) => `• ${u}`).join('\n')}`,
    ephemeral: true,
    allowedMentions: { parse: [] },
  });
}
