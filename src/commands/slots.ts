import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import { slots } from '../services/gamblingService.js';
import { InsufficientFundsError } from '../services/currencyService.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('slots')
  .setDescription('Spin the slots — match symbols to win')
  .addIntegerOption((o) =>
    o.setName('amount').setDescription('Stake').setMinValue(1).setRequired(true),
  )
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const stake = interaction.options.getInteger('amount', true);

  const config = guildConfigRepo.get(db, interaction.guildId);
  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);
  if (stake < config.bet_min || stake > config.bet_max) {
    await interaction.reply({
      content: `Bets must be between ${crystals(config.bet_min, emoji)} and ${crystals(config.bet_max, emoji)}.`,
      ephemeral: true,
    });
    return;
  }

  try {
    const r = slots(db, interaction.guildId, interaction.user.id, stake);
    const reels = `[ ${r.reels.join(' | ')} ]`;
    const verdict =
      r.multiplier === 0
        ? `😬 No match. You lose ${crystals(stake, emoji)}.`
        : r.delta > 0
          ? `🎉 ${r.multiplier}× payout! You win ${crystals(r.delta, emoji)}.`
          : `🎉 ${r.multiplier}× payout, but it doesn't beat your stake. Net: ${crystals(r.delta, emoji)}.`;
    await interaction.reply(`🎰 ${reels}\n${verdict}\nNew balance: ${crystals(r.newBalance, emoji)}`);
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      await interaction.reply({
        content: `⛔ You only have ${crystals(err.balance, emoji)}.`,
        ephemeral: true,
      });
      return;
    }
    throw err;
  }
}
