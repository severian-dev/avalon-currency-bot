import { type ButtonInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import { resolveDuel } from '../services/gamblingService.js';
import { InsufficientFundsError } from '../services/currencyService.js';
import { duelResultEmbed } from '../builders/duelEmbed.js';
import { parseDuelButtonId, DUEL_ACCEPT, DUEL_DECLINE } from '../types/customIds.js';
import * as userRepo from '../database/repositories/userRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import { crystals } from '../utils/formatting.js';

interface PendingDuel {
  guildId: string;
  challengerId: string;
  opponentId: string;
  stake: number;
  expiresAt: number;
}

const pending = new Map<string, PendingDuel>();

export function registerPendingDuel(key: string, duel: PendingDuel): void {
  pending.set(key, duel);
  setTimeout(() => pending.delete(key), duel.expiresAt - Date.now() + 5_000).unref();
}

export async function handle(interaction: ButtonInteraction, db: Database.Database): Promise<boolean> {
  const parsed = parseDuelButtonId(interaction.customId);
  if (!parsed) return false;
  if (parsed.prefix !== DUEL_ACCEPT && parsed.prefix !== DUEL_DECLINE) return false;

  const duel = pending.get(parsed.duelKey);
  if (!duel) {
    await interaction.reply({ content: 'This duel has already expired.', ephemeral: true });
    return true;
  }

  if (interaction.user.id !== duel.opponentId) {
    await interaction.reply({
      content: 'Only the challenged user can respond.',
      ephemeral: true,
    });
    return true;
  }

  if (parsed.prefix === DUEL_DECLINE) {
    pending.delete(parsed.duelKey);
    await interaction.update({
      content: `🛑 <@${duel.opponentId}> declined the duel.`,
      embeds: [],
      components: [],
      allowedMentions: { users: [] },
    });
    return true;
  }

  // Accept path. Re-check both balances right before resolving.
  const challengerBalance = userRepo.getBalance(db, duel.guildId, duel.challengerId);
  const opponentBalance = userRepo.getBalance(db, duel.guildId, duel.opponentId);
  const emoji = guildConfigRepo.getCrystalEmoji(db, duel.guildId);

  if (challengerBalance < duel.stake || opponentBalance < duel.stake) {
    pending.delete(parsed.duelKey);
    await interaction.update({
      content: `⚠️ Duel canceled — one of you no longer has ${crystals(duel.stake, emoji)}.`,
      embeds: [],
      components: [],
      allowedMentions: { users: [] },
    });
    return true;
  }

  pending.delete(parsed.duelKey);

  try {
    const r = resolveDuel(db, duel.guildId, duel.challengerId, duel.opponentId, duel.stake);
    await interaction.update({
      content: '',
      embeds: [duelResultEmbed(r.winnerId, r.loserId, duel.stake, emoji)],
      components: [],
      allowedMentions: { users: [r.winnerId, r.loserId] },
    });
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      await interaction.reply({
        content: `One side could not cover the stake.`,
        ephemeral: true,
      });
      return true;
    }
    throw err;
  }
  return true;
}
