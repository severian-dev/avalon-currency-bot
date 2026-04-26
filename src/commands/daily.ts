import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import { claimDaily, DailyOnCooldownError } from '../services/dailyService.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('daily')
  .setDescription('Claim your daily crystals')
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  try {
    const result = claimDaily(db, interaction.guildId, interaction.user.id);
    const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);
    const bonus = result.streakBonus > 0 ? ` (+${result.streakBonus} streak bonus)` : '';
    await interaction.reply({
      content: `🎁 Claimed **${crystals(result.amount, emoji)}**${bonus} · 🔥 Day ${result.newStreak} · Balance: **${crystals(result.newBalance, emoji)}**`,
    });
  } catch (err) {
    if (err instanceof DailyOnCooldownError) {
      const unix = Math.floor(err.nextAvailableAt.getTime() / 1000);
      await interaction.reply({
        content: `⏳ You already claimed today. Next claim <t:${unix}:R>.`,
        ephemeral: true,
      });
      return;
    }
    throw err;
  }
}
