import { EmbedBuilder } from 'discord.js';
import type { GuildConfigRow } from '../database/repositories/guildConfigRepo.js';

function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '*(unset)*';
  return String(v);
}

export function configEmbed(config: GuildConfigRow): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Guild config')
    .setColor(0x9b59ff)
    .addFields(
      { name: 'redemption_channel_id', value: fmt(config.redemption_channel_id), inline: true },
      { name: 'give_role_id', value: fmt(config.give_role_id), inline: true },
      { name: 'daily_min', value: fmt(config.daily_min), inline: true },
      { name: 'daily_max', value: fmt(config.daily_max), inline: true },
      { name: 'daily_streak_bonus', value: fmt(config.daily_streak_bonus), inline: true },
      { name: 'daily_streak_cap', value: fmt(config.daily_streak_cap), inline: true },
      { name: 'activity_enabled', value: fmt(config.activity_enabled), inline: true },
      { name: 'activity_drop_chance', value: fmt(config.activity_drop_chance), inline: true },
      { name: 'activity_drop_min', value: fmt(config.activity_drop_min), inline: true },
      { name: 'activity_drop_max', value: fmt(config.activity_drop_max), inline: true },
      { name: 'activity_drop_cooldown_seconds', value: fmt(config.activity_drop_cooldown_seconds), inline: true },
      { name: 'activity_drop_daily_cap', value: fmt(config.activity_drop_daily_cap), inline: true },
      { name: 'activity_drop_emoji', value: fmt(config.activity_drop_emoji), inline: true },
      { name: 'claim_drops_enabled', value: fmt(config.claim_drops_enabled), inline: true },
      { name: 'claim_drop_min', value: fmt(config.claim_drop_min), inline: true },
      { name: 'claim_drop_max', value: fmt(config.claim_drop_max), inline: true },
      { name: 'claim_drop_window_seconds', value: fmt(config.claim_drop_window_seconds), inline: true },
      { name: 'claim_drop_active_window_minutes', value: fmt(config.claim_drop_active_window_minutes), inline: true },
      { name: 'claim_drop_probability_per_tick', value: fmt(config.claim_drop_probability_per_tick), inline: true },
      { name: 'claim_drop_tick_seconds', value: fmt(config.claim_drop_tick_seconds), inline: true },
      { name: 'claim_drop_emoji', value: fmt(config.claim_drop_emoji), inline: true },
      { name: 'claim_drop_min_gap_minutes', value: fmt(config.claim_drop_min_gap_minutes), inline: true },
      { name: 'bet_min', value: fmt(config.bet_min), inline: true },
      { name: 'bet_max', value: fmt(config.bet_max), inline: true },
      { name: 'lottery_enabled', value: fmt(config.lottery_enabled), inline: true },
      { name: 'lottery_ticket_price', value: fmt(config.lottery_ticket_price), inline: true },
      { name: 'lottery_draw_channel_id', value: fmt(config.lottery_draw_channel_id), inline: true },
      { name: 'lottery_period_hours', value: fmt(config.lottery_period_hours), inline: true },
    );
}
