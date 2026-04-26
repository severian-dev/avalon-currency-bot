import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as redemptionRepo from '../database/repositories/redemptionRepo.js';
import { fulfill, refund } from '../services/shopService.js';
import { redemptionListEmbed } from '../builders/redemptionEmbed.js';
import { isAdmin } from '../services/permissionService.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('redemption')
  .setDescription('[Admin] Manage shop redemptions')
  .addSubcommand((s) =>
    s
      .setName('list')
      .setDescription('List redemptions')
      .addStringOption((o) =>
        o
          .setName('status')
          .setDescription('Filter')
          .addChoices(
            { name: 'pending', value: 'pending' },
            { name: 'fulfilled', value: 'fulfilled' },
            { name: 'denied', value: 'denied' },
          ),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('fulfill')
      .setDescription('Mark a pending redemption fulfilled')
      .addIntegerOption((o) =>
        o.setName('id').setDescription('Redemption ID').setMinValue(1).setRequired(true),
      )
      .addStringOption((o) => o.setName('notes').setDescription('Optional notes')),
  )
  .addSubcommand((s) =>
    s
      .setName('deny')
      .setDescription('Deny a pending redemption and refund the user')
      .addIntegerOption((o) =>
        o.setName('id').setDescription('Redemption ID').setMinValue(1).setRequired(true),
      )
      .addStringOption((o) => o.setName('notes').setDescription('Optional notes')),
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

  const sub = interaction.options.getSubcommand();

  if (sub === 'list') {
    const status = interaction.options.getString('status') as
      | 'pending'
      | 'fulfilled'
      | 'denied'
      | null;
    const rows = redemptionRepo.list(db, interaction.guildId, status ?? undefined, 25);
    await interaction.reply({
      embeds: [redemptionListEmbed(rows, status ?? undefined)],
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
    return;
  }

  if (sub === 'fulfill') {
    const id = interaction.options.getInteger('id', true);
    const notes = interaction.options.getString('notes');
    const ok = fulfill(db, interaction.guildId, id, interaction.user.id, notes);
    await interaction.reply({
      content: ok ? `✅ Fulfilled redemption #${id}.` : `Could not fulfill #${id} (not pending or doesn't exist).`,
      ephemeral: true,
    });
    return;
  }

  if (sub === 'deny') {
    const id = interaction.options.getInteger('id', true);
    const notes = interaction.options.getString('notes');
    const result = refund(db, interaction.guildId, id, interaction.user.id, notes);
    if (!result) {
      await interaction.reply({
        content: `Could not deny #${id} (not pending or doesn't exist).`,
        ephemeral: true,
      });
      return;
    }
    await interaction.reply({
      content: `✅ Denied #${id}. Refunded ${crystals(result.amount)} to <@${result.userId}>. New balance: ${crystals(result.newBalance)}.`,
      ephemeral: true,
      allowedMentions: { parse: [] },
    });
  }
}
