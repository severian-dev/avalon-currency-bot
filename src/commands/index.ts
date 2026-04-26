import type { BotClient, Command } from '../client.js';
import * as balance from './balance.js';
import * as daily from './daily.js';
import * as give from './give.js';
import * as grant from './grant.js';
import * as revoke from './revoke.js';
import * as leaderboard from './leaderboard.js';
import * as shop from './shop.js';
import * as redeem from './redeem.js';
import * as setup from './setup.js';
import * as config from './config.js';
import * as shopAdd from './shop-add.js';
import * as shopEdit from './shop-edit.js';
import * as shopRemove from './shop-remove.js';
import * as forumReward from './forum-reward.js';
import * as redemption from './redemption.js';
import * as activityChannel from './activity-channel.js';
import * as claimDropChannel from './claim-drop-channel.js';
import * as coinflip from './coinflip.js';
import * as slots from './slots.js';
import * as duel from './duel.js';
import * as lottery from './lottery.js';

const commands: Command[] = [
  balance,
  daily,
  give,
  grant,
  revoke,
  leaderboard,
  shop,
  redeem,
  setup,
  config,
  shopAdd,
  shopEdit,
  shopRemove,
  forumReward,
  redemption,
  activityChannel,
  claimDropChannel,
  coinflip,
  slots,
  duel,
  lottery,
] as unknown as Command[];

export async function loadCommands(client: BotClient): Promise<void> {
  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }
}

export function getCommandData(): unknown[] {
  return commands.map((c) => c.data.toJSON());
}
