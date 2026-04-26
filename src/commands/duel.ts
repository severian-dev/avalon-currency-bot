import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type Database from 'better-sqlite3';
import * as userRepo from '../database/repositories/userRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { duelChallengeEmbed, duelButtons } from '../builders/duelEmbed.js';
import { registerPendingDuel } from '../handlers/duelButton.js';
import { crystals } from '../utils/formatting.js';
import { randomUUID } from 'node:crypto';

export const data = new SlashCommandBuilder()
  .setName('duel')
  .setDescription('Challenge another user to a crystal duel — winner takes the pot')
  .addUserOption((o) => o.setName('user').setDescription('Opponent').setRequired(true))
  .addIntegerOption((o) =>
    o.setName('amount').setDescription('Stake (each side)').setMinValue(1).setRequired(true),
  )
  .setDMPermission(false);

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const opponent = interaction.options.getUser('user', true);
  const stake = interaction.options.getInteger('amount', true);

  if (opponent.bot) {
    await interaction.reply({ content: '🙅 You can\'t duel a bot.', ephemeral: true });
    return;
  }
  if (opponent.id === interaction.user.id) {
    await interaction.reply({ content: '🙅 You can\'t duel yourself.', ephemeral: true });
    return;
  }

  const config = guildConfigRepo.get(db, interaction.guildId);
  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);
  if (stake < config.bet_min || stake > config.bet_max) {
    await interaction.reply({
      content: `Stake must be between ${crystals(config.bet_min, emoji)} and ${crystals(config.bet_max, emoji)}.`,
      ephemeral: true,
    });
    return;
  }

  const challengerBalance = userRepo.getBalance(db, interaction.guildId, interaction.user.id);
  if (challengerBalance < stake) {
    await interaction.reply({
      content: `⛔ You only have ${crystals(challengerBalance, emoji)}.`,
      ephemeral: true,
    });
    return;
  }

  const opponentBalance = userRepo.getBalance(db, interaction.guildId, opponent.id);
  if (opponentBalance < stake) {
    await interaction.reply({
      content: `⛔ <@${opponent.id}> only has ${crystals(opponentBalance, emoji)} — not enough to accept.`,
      allowedMentions: { users: [] },
    });
    return;
  }

  const duelKey = randomUUID().slice(0, 8);
  registerPendingDuel(duelKey, {
    guildId: interaction.guildId,
    challengerId: interaction.user.id,
    opponentId: opponent.id,
    stake,
    expiresAt: Date.now() + 60_000,
  });

  await interaction.reply({
    content: `<@${opponent.id}>`,
    embeds: [duelChallengeEmbed(interaction.user.id, opponent.id, stake, emoji)],
    components: [duelButtons(duelKey)],
    allowedMentions: { users: [opponent.id] },
  });

  setTimeout(async () => {
    try {
      const message = await interaction.fetchReply();
      if (message.components?.length) {
        await interaction.editReply({
          components: [],
          content: `⌛ Duel offer to <@${opponent.id}> expired.`,
          embeds: [],
          allowedMentions: { users: [] },
        });
      }
    } catch {
      // best-effort: interaction may have already been resolved
    }
  }, 60_000).unref();
}
