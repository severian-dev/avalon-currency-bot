import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
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
  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);
  await interaction.respond(
    items.map((i) => {
      const itemPrefix = i.emoji ? `${i.emoji} ` : '';
      return {
        name: `#${i.id} · ${itemPrefix}${i.name} — ${i.price} ${emoji}${i.stock !== null ? ` (${i.stock} left)` : ''}`.slice(0, 100),
        value: i.id,
      };
    }),
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

  const emoji = guildConfigRepo.getCrystalEmoji(db, interaction.guildId);

  let result;
  try {
    result = redeem(db, interaction.guildId, interaction.user.id, itemId);
  } catch (err) {
    if (err instanceof InsufficientFundsError) {
      await interaction.reply({
        content: `⛔ You only have ${crystals(err.balance, emoji)}. This item costs more.`,
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

  const item = shopRepo.getById(db, interaction.guildId, result.itemId);
  const itemDisplay = item?.emoji ? `${item.emoji} ${result.itemName}` : result.itemName;

  await interaction.reply({
    content:
      `🎁 Redeemed **${itemDisplay}** for ${crystals(result.pricePaid, emoji)}.\n` +
      `New balance: ${crystals(result.newBalance, emoji)}\n` +
      `An admin will fulfill your redemption. Redemption ID: **#${result.redemptionId}**`,
    ephemeral: true,
  });

  const redemption = redemptionRepo.getById(db, interaction.guildId, result.redemptionId);
  if (item && redemption) {
    let postFailureReason: string | null = null;
    try {
      const channel = await interaction.client.channels.fetch(config.redemption_channel_id);
      if (!channel) {
        postFailureReason = 'channel not found (it may have been deleted)';
      } else if (!channel.isTextBased() || !('send' in channel)) {
        postFailureReason = `channel <#${config.redemption_channel_id}> is not a text channel`;
      } else {
        await channel.send({
          content: `<@${interaction.user.id}>`,
          embeds: [pendingRedemptionEmbed(redemption, item, emoji)],
          allowedMentions: { users: [] },
        });
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      console.error('Failed to post redemption to channel:', e);
      postFailureReason = `${reason} (check that I have Send Messages + Embed Links in <#${config.redemption_channel_id}>)`;
    }

    if (postFailureReason) {
      await interaction.followUp({
        content:
          `⚠️ Your redemption #${result.redemptionId} was recorded, but I couldn't post it to the admin channel: ${postFailureReason}.\n` +
          `Please ping an admin so they can fulfill it manually.`,
        ephemeral: true,
      });
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
