import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type Database from 'better-sqlite3';
import type { BotEnv } from './config/schema.js';

export interface Command {
  data: { name: string; toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction, db: Database.Database, env: BotEnv): Promise<void>;
}

export interface BotClient extends Client {
  commands: Collection<string, Command>;
}

export function createClient(): BotClient {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
    ],
    // Reactions on uncached messages need partials so messageReactionAdd still fires.
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  }) as BotClient;

  client.commands = new Collection();
  return client;
}
