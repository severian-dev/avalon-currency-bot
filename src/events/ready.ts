import { ActivityType, type Client } from 'discord.js';

export const name = 'ready';
export const once = true;

export function execute(client: Client): void {
  console.log(`Logged in as ${client.user?.tag}`);
  client.user?.setPresence({
    activities: [{ name: 'custom', type: ActivityType.Custom, state: 'Crystals? /info' }],
    status: 'online',
  });
}
