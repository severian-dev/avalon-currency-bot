import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import { coinflip } from '../services/gamblingService.js';
import { InsufficientFundsError } from '../services/currencyService.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('coinflip')
  .setDescription('Flip a coin for crystals — win 2x stake')
  .addIntegerOption((o) =>
    o.setName('amount').setDescription('Stake').setMinValue(1).setRequired(true),
  )
  .addStringOption((o) =>
    o
      .setName('call')
      .setDescription('heads or tails')
      .setRequired(true)
      .addChoices({ name: 'heads', value: 'heads' }, { name: 'tails', value: 'tails' }),
  )
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const stake = interaction.options.getInteger('amount', true);
  const guess = interaction.options.getString('call', true) as 'heads' | 'tails';

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
    const r = coinflip(db, interaction.guildId, interaction.user.id, stake, guess);
    const face = r.outcome === 'heads' ? '🪙 heads' : '🪙 tails';
    const verdict = r.win
      ? `🎉 You called ${guess} — it's ${face}! You win ${crystals(stake, emoji)}.`
      : `😬 You called ${guess} — it's ${face}. You lose ${crystals(stake, emoji)}.`;
    await interaction.reply(`${verdict}\nNew balance: ${crystals(r.newBalance, emoji)}`);
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
