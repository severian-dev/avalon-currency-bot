import {
  type Interaction,
  type ChatInputCommandInteraction,
} from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotClient } from '../client.js';
import type { BotEnv } from '../config/schema.js';
import { handle as handleDuelButton } from '../handlers/duelButton.js';
import * as redeemCommand from '../commands/redeem.js';

export const name = 'interactionCreate';

export async function execute(
  interaction: Interaction,
  db: Database.Database,
  env: BotEnv,
): Promise<void> {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName === 'redeem') {
      try {
        await redeemCommand.autocomplete(interaction, db);
      } catch (err) {
        console.error('autocomplete error:', err);
      }
    }
    return;
  }

  if (interaction.isButton()) {
    try {
      const handled = await handleDuelButton(interaction, db);
      if (handled) return;
    } catch (err) {
      console.error('button handler error:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Something went wrong.', ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const client = interaction.client as BotClient;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction as ChatInputCommandInteraction, db, env);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const reply = { content: '⚠️ Something went wrong running that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
}
