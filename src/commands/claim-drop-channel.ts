import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as claimDropRepo from '../database/repositories/claimDropRepo.js';
import { isAdmin } from '../services/permissionService.js';

export const data = new SlashCommandBuilder()
  .setName('claim-drop-channel')
  .setDescription('[Admin] Manage the scheduled claim-drop allowlist')
  .addSubcommand((s) =>
    s
      .setName('add')
      .setDescription('Allow scheduled claim drops in this channel')
      .addChannelOption((o) =>
        o
          .setName('channel')
          .setDescription('Channel')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('remove')
      .setDescription('Stop scheduled claim drops in this channel')
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
    claimDropRepo.addAllowed(db, interaction.guildId, channel.id);
    await interaction.reply({
      content: `✅ Scheduled claim drops enabled in <#${channel.id}>. Set \`claim_drops_enabled = 1\` and \`claim_drop_emoji\` via \`/config set\` if needed.`,
      ephemeral: true,
    });
    return;
  }
  if (sub === 'remove') {
    const channel = interaction.options.getChannel('channel', true);
    const removed = claimDropRepo.removeAllowed(db, interaction.guildId, channel.id);
    await interaction.reply({
      content: removed ? `✅ Stopped scheduled drops in <#${channel.id}>.` : `<#${channel.id}> wasn't on the list.`,
      ephemeral: true,
    });
    return;
  }
  if (sub === 'list') {
    const ids = claimDropRepo.listAllowed(db, interaction.guildId);
    const embed = new EmbedBuilder()
      .setTitle('Claim-drop channels')
      .setColor(0x9b59ff)
      .setDescription(ids.length ? ids.map((id) => `<#${id}>`).join('\n') : 'None.');
    await interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
  }
}
