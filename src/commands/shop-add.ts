import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as shopRepo from '../database/repositories/shopRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { isAdmin } from '../services/permissionService.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('shop-add')
  .setDescription('[Admin] Add an item to the shop')
  .addStringOption((o) => o.setName('name').setDescription('Item name').setRequired(true))
  .addIntegerOption((o) =>
    o.setName('price').setDescription('Price in crystals').setMinValue(1).setRequired(true),
  )
  .addIntegerOption((o) =>
    o.setName('stock').setDescription('Limited stock (omit for unlimited)').setMinValue(0).setRequired(false),
  )
  .addStringOption((o) =>
    o.setName('description').setDescription('Item description').setRequired(false),
  )
  .addStringOption((o) =>
    o.setName('payload').setDescription('Text DM\'d to user on redeem (e.g. a code)').setRequired(false),
  )
  .addStringOption((o) =>
    o.setName('emoji').setDescription('Emoji shown next to this item in the shop').setRequired(false),
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

  const name = interaction.options.getString('name', true);
  const price = interaction.options.getInteger('price', true);
  const stock = interaction.options.getInteger('stock');
  const description = interaction.options.getString('description');
  const payload = interaction.options.getString('payload');
  const itemEmoji = interaction.options.getString('emoji');

  const id = shopRepo.add(db, interaction.guildId, {
    name,
    price,
    stock: stock ?? null,
    description,
    payload,
    emoji: itemEmoji,
    createdBy: interaction.user.id,
  });

  const crystalEmoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);
  const display = itemEmoji ? `${itemEmoji} ${name}` : name;
  await interaction.reply({
    content:
      `✅ Added shop item **#${id} · ${display}** for ${crystals(price, crystalEmoji)}` +
      (stock !== null ? ` (stock: ${stock})` : ' (unlimited stock)') +
      (payload ? '\nA payload will be DM\'d on redeem.' : ''),
    ephemeral: true,
  });
}
