import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as shopRepo from '../database/repositories/shopRepo.js';
import { isAdmin } from '../services/permissionService.js';

const FIELDS = ['name', 'description', 'price', 'stock', 'payload', 'emoji', 'active'] as const;

export const data = new SlashCommandBuilder()
  .setName('shop-edit')
  .setDescription('[Admin] Edit a shop item')
  .addIntegerOption((o) =>
    o.setName('id').setDescription('Shop item ID').setMinValue(1).setRequired(true),
  )
  .addStringOption((o) =>
    o
      .setName('field')
      .setDescription('Field to edit')
      .setRequired(true)
      .addChoices(...FIELDS.map((f) => ({ name: f, value: f }))),
  )
  .addStringOption((o) => o.setName('value').setDescription('New value').setRequired(true))
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
  const field = interaction.options.getString('field', true) as (typeof FIELDS)[number];
  const rawValue = interaction.options.getString('value', true);

  if (!shopRepo.getById(db, interaction.guildId, id)) {
    await interaction.reply({ content: `No item #${id}.`, ephemeral: true });
    return;
  }

  let value: string | number | null;
  if (field === 'price') {
    const n = parseInt(rawValue, 10);
    if (Number.isNaN(n) || n < 0) {
      await interaction.reply({ content: 'price must be a non-negative integer', ephemeral: true });
      return;
    }
    value = n;
  } else if (field === 'stock') {
    if (rawValue === 'null' || rawValue === '') {
      value = null;
    } else {
      const n = parseInt(rawValue, 10);
      if (Number.isNaN(n) || n < 0) {
        await interaction.reply({
          content: 'stock must be a non-negative integer or "null" for unlimited',
          ephemeral: true,
        });
        return;
      }
      value = n;
    }
  } else if (field === 'active') {
    value = rawValue === '1' || rawValue.toLowerCase() === 'true' ? 1 : 0;
  } else if (field === 'description' || field === 'payload' || field === 'emoji') {
    value = rawValue === 'null' ? null : rawValue;
  } else {
    value = rawValue;
  }

  shopRepo.update(db, interaction.guildId, id, field, value);
  await interaction.reply({
    content: `✅ Updated #${id}: \`${field}\` = \`${value === null ? 'null' : String(value)}\``,
    ephemeral: true,
  });
}
