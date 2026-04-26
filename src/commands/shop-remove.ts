import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as shopRepo from '../database/repositories/shopRepo.js';
import { isAdmin } from '../services/permissionService.js';

export const data = new SlashCommandBuilder()
  .setName('shop-remove')
  .setDescription('[Admin] Soft-remove a shop item (sets active = 0)')
  .addIntegerOption((o) =>
    o.setName('id').setDescription('Shop item ID').setMinValue(1).setRequired(true),
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

  const id = interaction.options.getInteger('id', true);
  const item = shopRepo.getById(db, interaction.guildId, id);
  if (!item) {
    await interaction.reply({ content: `No item #${id}.`, ephemeral: true });
    return;
  }

  shopRepo.update(db, interaction.guildId, id, 'active', 0);
  await interaction.reply({
    content: `✅ Removed shop item #${id} (${item.name}).`,
    ephemeral: true,
  });
}
