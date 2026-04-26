import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import * as lotteryRepo from '../database/repositories/lotteryRepo.js';
import { buyTickets, ensureOpenRound } from '../services/lotteryService.js';
import { InsufficientFundsError } from '../services/currencyService.js';
import { lotteryInfoEmbed } from '../builders/lotteryEmbed.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('lottery')
  .setDescription('Crystal lottery — buy tickets, weekly draws')
  .addSubcommand((s) =>
    s
      .setName('buy')
      .setDescription('Buy tickets into the open round')
      .addIntegerOption((o) =>
        o.setName('tickets').setDescription('Number of tickets').setMinValue(1).setRequired(true),
      ),
  )
  .addSubcommand((s) => s.setName('info').setDescription('Show the current pot and draw time'))
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const sub = interaction.options.getSubcommand();
  const config = guildConfigRepo.get(db, interaction.guildId);

  if (!config.lottery_enabled) {
    await interaction.reply({
      content: '🎟️ The lottery is not enabled. Set `lottery_enabled = 1` via `/config set`.',
      ephemeral: true,
    });
    return;
  }

  if (sub === 'info') {
    const round = ensureOpenRound(db, interaction.guildId);
    const yourTickets = lotteryRepo.userTickets(db, round.id, interaction.user.id);
    await interaction.reply({
      embeds: [lotteryInfoEmbed(round, config.lottery_ticket_price, yourTickets)],
    });
    return;
  }

  if (sub === 'buy') {
    const count = interaction.options.getInteger('tickets', true);
    try {
      const r = buyTickets(db, interaction.guildId, interaction.user.id, count);
      const cost = count * config.lottery_ticket_price;
      await interaction.reply({
        content:
          `🎟️ Bought ${count} ticket${count === 1 ? '' : 's'} for ${crystals(cost)}.\n` +
          `You now hold ${r.totalTickets} ticket${r.totalTickets === 1 ? '' : 's'}.\n` +
          `Pot: ${crystals(r.pot)} · New balance: ${crystals(r.newBalance)}`,
      });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        await interaction.reply({
          content: `⛔ You only have ${crystals(err.balance)}.`,
          ephemeral: true,
        });
        return;
      }
      throw err;
    }
  }
}
