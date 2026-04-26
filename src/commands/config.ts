import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { ALLOWED_KEYS, type ConfigKey } from '../database/repositories/guildConfigRepo.js';
import { configEmbed } from '../builders/configEmbed.js';
import { isAdmin } from '../services/permissionService.js';

const INT_KEYS = new Set<ConfigKey>([
  'daily_min',
  'daily_max',
  'daily_streak_bonus',
  'daily_streak_cap',
  'activity_enabled',
  'activity_drop_min',
  'activity_drop_max',
  'activity_drop_cooldown_seconds',
  'activity_drop_daily_cap',
  'claim_drops_enabled',
  'claim_drop_min',
  'claim_drop_max',
  'claim_drop_window_seconds',
  'claim_drop_active_window_minutes',
  'claim_drop_tick_seconds',
  'claim_drop_min_gap_minutes',
  'bet_min',
  'bet_max',
  'slots_house_edge_bps',
  'lottery_enabled',
  'lottery_ticket_price',
  'lottery_period_hours',
]);

const FLOAT_KEYS = new Set<ConfigKey>(['activity_drop_chance', 'claim_drop_probability_per_tick']);

const STRING_KEYS = new Set<ConfigKey>([
  'redemption_channel_id',
  'give_role_id',
  'activity_drop_emoji',
  'claim_drop_emoji',
  'duel_announce_channel_id',
  'lottery_draw_channel_id',
]);

export const data = new SlashCommandBuilder()
  .setName('config')
  .setDescription('[Admin] View or edit guild config')
  .addSubcommand((s) => s.setName('show').setDescription('Show all current config values'))
  .addSubcommand((s) =>
    s
      .setName('set')
      .setDescription('Set a single config key')
      .addStringOption((o) =>
        o
          .setName('key')
          .setDescription('Config key')
          .setRequired(true)
          .setAutocomplete(true),
      )
      .addStringOption((o) =>
        o.setName('value').setDescription('New value (use "null" to clear)').setRequired(true),
      ),
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
  .setDMPermission(false);

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const query = interaction.options.getFocused().toLowerCase();
  const matches = ALLOWED_KEYS.filter((k) => k.toLowerCase().includes(query)).slice(0, 25);
  await interaction.respond(matches.map((k) => ({ name: k, value: k })));
}

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
  if (sub === 'show') {
    const config = guildConfigRepo.get(db, interaction.guildId);
    await interaction.reply({ embeds: [configEmbed(config)], ephemeral: true });
    return;
  }

  if (sub === 'set') {
    const rawKey = interaction.options.getString('key', true) as ConfigKey;
    const rawValue = interaction.options.getString('value', true);

    if (!ALLOWED_KEYS.includes(rawKey)) {
      await interaction.reply({ content: `Unknown key.`, ephemeral: true });
      return;
    }

    let value: string | number | null;
    if (rawValue === 'null' || rawValue === '') {
      if (!STRING_KEYS.has(rawKey)) {
        await interaction.reply({ content: 'Only string keys can be set to null.', ephemeral: true });
        return;
      }
      value = null;
    } else if (INT_KEYS.has(rawKey)) {
      const n = parseInt(rawValue, 10);
      if (Number.isNaN(n)) {
        await interaction.reply({ content: 'Value must be an integer.', ephemeral: true });
        return;
      }
      value = n;
    } else if (FLOAT_KEYS.has(rawKey)) {
      const n = parseFloat(rawValue);
      if (Number.isNaN(n)) {
        await interaction.reply({ content: 'Value must be a number.', ephemeral: true });
        return;
      }
      value = n;
    } else {
      value = rawValue;
    }

    guildConfigRepo.set(db, interaction.guildId, rawKey, value);
    await interaction.reply({
      content: `✅ Set \`${rawKey}\` = \`${value === null ? 'null' : String(value)}\``,
      ephemeral: true,
    });
  }
}
