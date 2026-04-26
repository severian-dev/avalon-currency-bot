import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as activityRepo from '../database/repositories/activityRepo.js';
import { isAdmin } from '../services/permissionService.js';

export const data = new SlashCommandBuilder()
  .setName('activity-channel')
  .setDescription('[Admin] Manage the per-message lucky-drop allowlist')
  .addSubcommand((s) =>
    s
      .setName('add')
      .setDescription('Allow per-message drops in this channel')
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('Channel')
          .addChannelTypes(ChannelType.GuildText, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.AnnouncementThread)
          .setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('remove')
      .setDescription('Stop dropping in this channel')
      .addChannelOption((o) =>
        o.setName('channel').setDescription('Channel').setRequired(true),
      ),
  )
  .addSubcommand((s) => s.setName('list').setDescription('List allowlisted channels'))
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

  if (sub === 'add') {
    const channel = interaction.options.getChannel('channel', true);
    activityRepo.addAllowed(db, interaction.guildId, channel.id);
    await interaction.reply({
      content: `✅ Lucky drops enabled in <#${channel.id}>. Set \`activity_enabled = 1\` via \`/config set\` if it isn't already.`,
      ephemeral: true,
    });
    return;
  }
  if (sub === 'remove') {
    const channel = interaction.options.getChannel('channel', true);
    const removed = activityRepo.removeAllowed(db, interaction.guildId, channel.id);
    await interaction.reply({
      content: removed ? `✅ Stopped lucky drops in <#${channel.id}>.` : `<#${channel.id}> wasn't on the list.`,
      ephemeral: true,
    });
    return;
  }
  if (sub === 'list') {
    const ids = activityRepo.listAllowed(db, interaction.guildId);
    const embed = new EmbedBuilder()
      .setTitle('Lucky-drop channels')
      .setColor(0x9b59ff)
      .setDescription(ids.length ? ids.map((id) => `<#${id}>`).join('\n') : 'None.');
    await interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
  }
}
