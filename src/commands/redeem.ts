import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  TextChannel,
  ChannelType,
} from 'discord.js';
import type Database from 'better-sqlite3';
import { redeem, ItemUnavailableError } from '../services/shopService.js';
import { InsufficientFundsError } from '../services/currencyService.js';
import * as shopRepo from '../database/repositories/shopRepo.js';
import * as guildConfigRepo from '../database/repositories/guildConfigRepo.js';
import * as redemptionRepo from '../database/repositories/redemptionRepo.js';
import { pendingRedemptionEmbed } from '../builders/redemptionEmbed.js';
import { crystals } from '../utils/formatting.js';

export const data = new SlashCommandBuilder()
  .setName('redeem')
  .setDescription('Redeem an item from the crystal shop')
  .addIntegerOption((o) =>
    o
      .setName('item')
      .setDescription('Shop item')
      .setRequired(true)
      .setAutocomplete(true),
  )
  .setDMPermission(false);

export async function autocomplete(
  interaction: AutocompleteInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const focused = interaction.options.getFocused();
  const items = shopRepo.searchActive(db, interaction.guildId, focused, 25);
  await interaction.respond(
    items.map((i) => ({
      name: `#${i.id} · ${i.name} — ${i.price} 💎${i.stock !== null ? ` (${i.stock} left)` : ''}`.slice(0, 100),
      value: i.id,
    })),
  );
}

export async function execute(
  interaction: ChatInputCommandInteraction,
  db: Database.Database,
): Promise<void> {
  if (!interaction.guildId) return;
  const itemId = interaction.options.getInteger('item', true);

  const config = guildConfigRepo.get(db, interaction.guildId);
  if (!config.redemption_channel_id) {
    await interaction.reply({
      content: '⚠️ Redemption channel is not configured. Ask an admin to run `/setup`.',
      ephemeral: true,
    });
    return;
  }

  let result;
  try {
    result = redeem(db, interaction.guildId, interaction.user.id, itemId);
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      await interaction.reply({
        content: `⛔ You only have ${crystals(err.balance)}. This item costs more.`,
        ephemeral: true,
      });
      return;
    }
    if (err instanceof ItemUnavailableError) {
      await interaction.reply({ content: `⚠️ Item not available: ${err.message}`, ephemeral: true });
      return;
    }
    throw err;
  }

  await interaction.reply({
    content:
      `🎁 Redeemed **${result.itemName}** for ${crystals(result.pricePaid)}.\n` +
      `New balance: ${crystals(result.newBalance)}\n` +
      `An admin will fulfill your redemption. Redemption ID: **#${result.redemptionId}**`,
    ephemeral: true,
  });

  const item = shopRepo.getById(db, interaction.guildId, result.itemId);
  const redemption = redemptionRepo.getById(db, interaction.guildId, result.redemptionId);
  if (item && redemption) {
    try {
      const channel = await interaction.client.channels.fetch(config.redemption_channel_id);
      if (channel && channel.type === ChannelType.GuildText) {
        await (channel as TextChannel).send({
          content: `<@${interaction.user.id}>`,
          embeds: [pendingRedemptionEmbed(redemption, item)],
          allowedMentions: { users: [] },
        });
      }
    } catch (e) {
      console.error('Failed to post redemption to channel:', e);
    }
  }

  if (result.payload) {
    try {
      await interaction.user.send(
        `🎁 Your **${result.itemName}** redemption code:\n\`\`\`\n${result.payload}\n\`\`\``,
      );
    } catch {
      await interaction.followUp({
        content: '⚠️ I could not DM you the redemption payload — please enable DMs from server members and ping an admin.',
        ephemeral: true,
      });
    }
  }
}
